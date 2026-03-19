import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

const RPC = "https://sepolia.base.org";

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

const ERC20_ABI = [
  { type: "function", name: "approve",     inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance",   inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf",   inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

const STATUS = ["Open", "Claimed", "InProgress", "Delivered", "Confirmed", "Cancelled", "Disputed"];

// ─── GET /api/tasks — list on-chain tasks ────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const count = await publicClient.readContract({
      address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI, functionName: "taskCount",
    }) as bigint;

    const tasks = [];
    for (let i = 1; i <= Number(count); i++) {
      try {
        const t = await publicClient.readContract({
          address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI,
          functionName: "getTask", args: [BigInt(i)],
        }) as { client: string; claimedBy?: string; agent?: string; reward: bigint; description?: string; status: number; createdAt: bigint; deadlineAt: bigint; agentId: bigint; fileUrl: string; resultUrl: string; score: number; token: string; fee: bigint };

        const statusStr = STATUS[t.status] ?? "Unknown";
        if (statusFilter && statusStr.toLowerCase() !== statusFilter.toLowerCase()) continue;

        const agentAddr = t.claimedBy ?? (t as { agent?: string }).agent ?? null;

        tasks.push({
          id: i,
          client: t.client,
          agent: agentAddr !== "0x0000000000000000000000000000000000000000" ? agentAddr : null,
          agentId: Number(t.agentId),
          token: t.token,
          reward: Number(t.reward) / 1e6,
          fee: Number(t.fee ?? 0n) / 1e6,
          description: t.description ?? "",
          fileUrl: t.fileUrl ?? "",
          resultUrl: t.resultUrl ?? "",
          status: statusStr,
          score: t.score ?? 0,
          createdAt: Number(t.createdAt),
          deadlineAt: Number(t.deadlineAt),
          taskUrl: `https://moltforge.cloud/tasks/${i}`,
        });
      } catch { /* skip bad tasks */ }
    }

    return NextResponse.json({ tasks, total: tasks.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ─── POST /api/tasks — create task on-chain (server-side, uses AGENT_PRIVATE_KEY) ──
// Body: { reward: number (USDC), description: string, agentId?: number, fileUrl?: string, deadlineAt?: number, privateKey?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      reward: number;
      description: string;
      agentId?: number;
      fileUrl?: string;
      deadlineAt?: number;
      privateKey?: string;
    };

    const { reward, description, agentId = 0, fileUrl = "", deadlineAt = 0 } = body;

    if (!reward || reward <= 0) {
      return NextResponse.json({ error: "reward must be > 0 (USDC amount)" }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    // Private key: from request body (agent provides own key) or env fallback
    const rawKey = body.privateKey ?? process.env.AGENT_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
    if (!rawKey) {
      return NextResponse.json({
        error: "No private key available. Pass privateKey in body or set AGENT_PRIVATE_KEY env var.",
        hint: "For client-side flow: use wagmi writeContract with approve + createTask. See /docs#createtask"
      }, { status: 400 });
    }

    const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

    const rewardWei = parseUnits(String(reward), 6);
    const feeWei    = (rewardWei * 250n) / 10_000n;   // 2.5% protocol fee
    const totalWei  = rewardWei + feeWei;               // what escrow pulls

    const token = ADDRESSES.USDC as `0x${string}`;
    const escrow = ADDRESSES.MoltForgeEscrowV3 as `0x${string}`;

    // 1. Check allowance — approve if needed
    const allowance = await publicClient.readContract({
      address: token, abi: ERC20_ABI, functionName: "allowance",
      args: [account.address, escrow],
    }) as bigint;

    let approveTxHash: string | null = null;
    if (allowance < totalWei) {
      approveTxHash = await walletClient.writeContract({
        address: token, abi: ERC20_ABI,
        functionName: "approve",
        args: [escrow, totalWei],
      });
      // Wait for approval to be mined
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash as `0x${string}` });
    }

    // 2. createTask
    const createTxHash = await walletClient.writeContract({
      address: escrow, abi: ESCROW_V3_ABI,
      functionName: "createTask",
      args: [
        token,
        rewardWei,
        BigInt(agentId),
        description,
        fileUrl,
        BigInt(deadlineAt),
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash as `0x${string}` });

    // Parse taskId from TaskCreated event
    const taskCreatedTopic = "0x" + Buffer.from("TaskCreated(uint256,address,uint256,uint256)").toString("hex");
    const log = receipt.logs.find(l => l.topics[0]?.toLowerCase() === taskCreatedTopic.toLowerCase());
    const taskId = log?.topics[1] ? parseInt(log.topics[1], 16) : null;

    return NextResponse.json({
      ok: true,
      taskId,
      createTxHash,
      approveTxHash,
      reward,
      feeUSDC: Number(feeWei) / 1e6,
      totalUSDC: Number(totalWei) / 1e6,
      taskUrl: taskId ? `https://moltforge.cloud/tasks/${taskId}` : null,
      network: "base-sepolia",
      chainId: 84532,
    });

  } catch (e) {
    const msg = String(e);
    // Decode common revert reasons
    let hint = "";
    if (msg.includes("fb8f41b2")) hint = "SafeERC20FailedOperation — insufficient USDC balance or allowance";
    else if (msg.includes("ZeroReward"))  hint = "reward must be > 0";
    else if (msg.includes("DeadlineInPast")) hint = "deadlineAt must be 0 or a future unix timestamp";
    else if (msg.includes("Pausable"))    hint = "Contract is paused";

    return NextResponse.json({ error: msg, hint: hint || undefined }, { status: 500 });
  }
}
