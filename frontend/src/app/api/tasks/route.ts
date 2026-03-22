import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI, AGENT_REGISTRY_ABI } from "@/lib/contracts";

const RPC = "https://sepolia.base.org";

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

// Cache wallet→agentId lookups to avoid hammering RPC on every /api/tasks call
const agentIdCache = new Map<string, number>();

async function resolveAgentId(wallet: string, contractAgentId: number): Promise<number> {
  const key = wallet.toLowerCase();
  if (key === "0x0000000000000000000000000000000000000000") return contractAgentId;
  if (agentIdCache.has(key)) return agentIdCache.get(key)!;
  try {
    const id = await publicClient.readContract({
      address: ADDRESSES.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentIdByWallet",
      args: [wallet as `0x${string}`],
    }) as bigint;
    const resolved = Number(id);
    if (resolved > 0) agentIdCache.set(key, resolved);
    return resolved > 0 ? resolved : contractAgentId;
  } catch {
    return contractAgentId;
  }
}

const ERC20_ABI = [
  { type: "function", name: "approve",     inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance",   inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf",   inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

// On-chain enum: 0=Open,1=Claimed,2=Delivered,3=Confirmed,4=Disputed,5=Resolved,6=Cancelled
const STATUS = ["Open", "Claimed", "InProgress", "Delivered", "Confirmed", "Cancelled", "Disputed"];

// ─── GET /api/tasks — list on-chain tasks ────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Single canonical escrow
    const escrows = [
      { address: ADDRESSES.MoltForgeEscrow as `0x${string}`, prefix: "" },
    ];

    const tasks = [];
    for (const esc of escrows) {
      const count = await publicClient.readContract({
        address: esc.address, abi: ESCROW_V3_ABI, functionName: "taskCount",
      }) as bigint;

      for (let i = 1; i <= Number(count); i++) {
        try {
          const t = await publicClient.readContract({
            address: esc.address, abi: ESCROW_V3_ABI,
            functionName: "getTask", args: [BigInt(i)],
          }) as { client: string; claimedBy?: string; agent?: string; reward: bigint; description?: string; status: number; createdAt: bigint; deadlineAt: bigint; agentId: bigint; fileUrl: string; resultUrl: string; score: number; token: string; fee: bigint };

          const statusStr = STATUS[t.status] ?? "Unknown";
          if (statusFilter && statusStr.toLowerCase() !== statusFilter.toLowerCase()) continue;

          const agentAddr = t.claimedBy ?? (t as { agent?: string }).agent ?? null;
          const agentAddrClean = agentAddr !== "0x0000000000000000000000000000000000000000" ? agentAddr : null;

          // Resolve on-chain agentId from canonical Registry (fixes #6 vs #9 mismatch)
          const resolvedAgentId = agentAddrClean
            ? await resolveAgentId(agentAddrClean, Number(t.agentId))
            : Number(t.agentId);

          tasks.push({
            id: `${esc.prefix}${i}`,
            escrow: esc.address,
            client: t.client,
            agent: agentAddrClean,
            agentId: resolvedAgentId,
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

    // Validate description has required resolution fields
    let descObj: Record<string, unknown> | null = null;
    try { descObj = JSON.parse(description); } catch { descObj = null; }
    if (!descObj || typeof descObj !== "object") {
      return NextResponse.json({
        error: "description must be a JSON object with title, description, and resolution fields",
        example: { title: "Task title", description: "What needs to be done", resolution: { deliverables: "What to deliver", acceptanceCriteria: "How to judge completion" } },
      }, { status: 400 });
    }
    if (!descObj.title || !(descObj.title as string).trim()) {
      return NextResponse.json({ error: "description.title is required" }, { status: 400 });
    }
    const resolution = descObj.resolution as Record<string, unknown> | undefined;
    if (!resolution || typeof resolution !== "object") {
      return NextResponse.json({ error: "description.resolution is required (must contain deliverables and acceptanceCriteria)" }, { status: 400 });
    }
    if (!resolution.deliverables || !(resolution.deliverables as string).trim()) {
      return NextResponse.json({ error: "description.resolution.deliverables is required — what should the agent deliver?" }, { status: 400 });
    }
    if (!resolution.acceptanceCriteria || !(resolution.acceptanceCriteria as string).trim()) {
      return NextResponse.json({ error: "description.resolution.acceptanceCriteria is required — how do you judge if the work is done?" }, { status: 400 });
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
    const feeWei    = 0n;                                  // no fee on creation — 0.1% deducted from agent on confirm
    const totalWei  = rewardWei;                          // client pays only reward

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
    let hint = "";
    let docs = "https://moltforge.cloud/docs";
    if (msg.includes("fb8f41b2")) { hint = "SafeERC20FailedOperation — insufficient USDC balance or allowance. Get tokens: POST /api/faucet"; docs += "#quick-start"; }
    else if (msg.includes("c506f361")) { hint = "NotOpenTask — wrong function for this task type. Open tasks (agentId=0) use applyForTask, direct-hire tasks use claimTask."; docs += "#task-types"; }
    else if (msg.includes("6c8a0fce")) { hint = "AgentMismatch — this task is assigned to a different agent."; docs += "#task-types"; }
    else if (msg.includes("ZeroReward"))  { hint = "reward must be > 0"; }
    else if (msg.includes("DeadlineInPast")) { hint = "deadlineAt must be 0 or a future unix timestamp"; }
    else if (msg.includes("Pausable"))    { hint = "Contract is paused"; }

    return NextResponse.json({ error: msg, hint: hint || undefined, docs }, { status: 500 });
  }
}
