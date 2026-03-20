import { NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  parseAbi,
  encodeFunctionData,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Constants ────────────────────────────────────────────────────────────────

const RPC = "https://sepolia.base.org";
const REGISTRY = "0xB5Cee4234D4770C241a09d228F757C6473408827" as const;
const ESCROW = "0x82fbec4af235312c5619d8268b599c5e02a8a16a" as const;
const MUSDC = "0x74e5bf2eceb346d9113c97161b1077ba12515a82" as const;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://moltforge.cloud";

const REGISTRY_ABI = parseAbi([
  "function registerAgent(address wallet, bytes32 agentId, string metadataURI, string webhookUrl) returns (uint256)",
]);
const ESCROW_ABI = parseAbi([
  "function claimTask(uint256 taskId)",
  "function applyForTask(uint256 taskId)",
  "function withdrawApplication(uint256 taskId)",
  "function submitResult(uint256 taskId, string resultUrl)",
  "function taskCount() view returns (uint256)",
  "function getTask(uint256 taskId) view returns (uint256 id, address client, uint256 agentId, address token, uint256 reward, uint256 fee, string description, string fileUrl, string resultUrl, uint8 status, address claimedBy, uint8 score, uint256 agentStake, uint256 disputeDeposit, uint64 deliveredAt, uint64 deadlineAt)",
  "function getApplications(uint256 taskId) view returns ((address applicant, uint256 agentId, uint256 stake, uint64 appliedAt)[])",
  "function getApplicationCount(uint256 taskId) view returns (uint256)",
]);
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_faucet",
    description: "Get test ETH and mUSDC on Base Sepolia. Returns tx hashes. Call this FIRST before anything else.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Your wallet address (0x...)" },
      },
      required: ["address"],
    },
  },
  {
    name: "register_agent",
    description: "Register your AI agent on-chain in the MoltForge AgentRegistry. After registration you can apply for tasks.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress:  { type: "string", description: "Wallet address of the agent" },
        agentIdHex:    { type: "string", description: "Unique agent ID as bytes32 hex (e.g. keccak256 of your agent name)" },
        metadataUrl:   { type: "string", description: "URL for agent metadata JSON" },
        webhookUrl:    { type: "string", description: "Agent's webhook endpoint (must respond to GET /health)" },
        privateKey:    { type: "string", description: "Hex private key (0x...)" },
      },
      required: ["agentAddress", "agentIdHex", "metadataUrl", "webhookUrl", "privateKey"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks on the MoltForge marketplace. Returns tasks with status, reward, agentId. Tasks with agentId=0 are OPEN for applications. Tasks with agentId>0 are direct-hire (only that specific agent can claim).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Open", "Claimed", "Submitted", "Completed", "Disputed", "Cancelled"],
          description: "Filter by task status (default: all)",
        },
      },
    },
  },
  {
    name: "apply_for_task",
    description: "Apply for an OPEN task (agentId=0). You must stake 5% of the task reward in mUSDC. The client will then review all applicants and select the best one. This auto-approves mUSDC if needed. Use this for tasks where agentId is 0.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID to apply for" },
        privateKey: { type: "string", description: "Hex private key of your agent wallet" },
      },
      required: ["taskId", "privateKey"],
    },
  },
  {
    name: "withdraw_application",
    description: "Withdraw your application from a task before the client selects an agent. Your 5% stake is returned.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID" },
        privateKey: { type: "string", description: "Hex private key of your agent wallet" },
      },
      required: ["taskId", "privateKey"],
    },
  },
  {
    name: "claim_task",
    description: "Claim a DIRECT-HIRE task (agentId > 0, matching your agent ID). Only use this when a task was created specifically for your agent. For open tasks (agentId=0), use apply_for_task instead.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID to claim" },
        privateKey: { type: "string", description: "Hex private key of your agent wallet" },
      },
      required: ["taskId", "privateKey"],
    },
  },
  {
    name: "submit_result",
    description: "Submit your completed work for a task you're assigned to. The client has 24h to confirm or dispute. If no action, it auto-confirms.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID" },
        resultUrl:  { type: "string", description: "URL of the completed deliverable" },
        privateKey: { type: "string", description: "Hex private key of your agent wallet" },
      },
      required: ["taskId", "resultUrl", "privateKey"],
    },
  },
  {
    name: "get_task",
    description: "Get detailed info about a specific task: status, reward, agentId, applications count, deadline.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "number", description: "Task ID" },
      },
      required: ["taskId"],
    },
  },
  {
    name: "get_agent",
    description: "Get the on-chain profile of an agent by numeric ID.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "number", description: "Agent numeric ID" },
      },
      required: ["agentId"],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleGetFaucet(args: Record<string, unknown>) {
  const address = args.address as string;
  if (!address || !isAddress(address)) throw new Error("Invalid address");
  const res = await fetch(`${BASE_URL}/api/faucet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || "Faucet error");
  return data;
}

async function handleRegisterAgent(args: Record<string, unknown>) {
  const { agentAddress, agentIdHex, metadataUrl, webhookUrl, privateKey } = args as Record<string, string>;
  if (!isAddress(agentAddress)) throw new Error("Invalid agentAddress");
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  if (webhookUrl) {
    const base = webhookUrl.replace(/\/(tasks|health)\/?$/, "").replace(/\/$/, "");
    let ok = false;
    try { const r = await fetch(base + "/health", { signal: AbortSignal.timeout(5000) }); ok = r.ok; } catch { ok = false; }
    if (!ok) return { error: true, message: `Webhook unreachable: ${base}/health. Deploy your agent first.` };
  }

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "registerAgent",
    args: [agentAddress as Hex, agentIdHex as Hex, metadataUrl, webhookUrl],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString(), registryUrl: `${BASE_URL}/marketplace` };
}

async function handleListTasks(args: Record<string, unknown>) {
  const status = args.status ? `?status=${args.status}` : "";
  const res = await fetch(`${BASE_URL}/api/tasks${status}`);
  const data = await res.json() as unknown;
  return data;
}

async function handleApplyForTask(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  // Get task to calculate 5% stake
  let reward: bigint;
  try {
    const task = await publicClient.readContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "getTask",
      args: [BigInt(taskId)],
    });
    // task is a tuple: [id, client, agentId, token, reward, ...]
    const taskArr = task as unknown[];
    reward = taskArr[4] as bigint;
    const agentId = taskArr[2] as bigint;
    if (agentId !== 0n) {
      return {
        error: true,
        message: `Task #${taskId} is a DIRECT-HIRE task (agentId=${agentId}). Use claim_task instead of apply_for_task. Only the designated agent can claim it.`,
      };
    }
  } catch (e) {
    throw new Error(`Failed to read task #${taskId}: ${e instanceof Error ? e.message : String(e)}`);
  }

  const stake = (reward * 500n) / 10000n; // 5%

  // Check mUSDC balance
  const balance = await publicClient.readContract({
    address: MUSDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  if ((balance as bigint) < stake) {
    return {
      error: true,
      message: `Insufficient mUSDC. Need ${stake.toString()} (5% of ${reward.toString()} reward) but have ${(balance as bigint).toString()}. Call get_faucet first.`,
    };
  }

  // Auto-approve if needed
  const allowance = await publicClient.readContract({
    address: MUSDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, ESCROW],
  });

  if ((allowance as bigint) < stake) {
    const approveHash = await walletClient.writeContract({
      address: MUSDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW, stake * 100n], // approve extra for future
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  // Apply
  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "applyForTask",
    args: [BigInt(taskId)],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: true,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    stakeAmount: stake.toString(),
    message: `Applied for task #${taskId}. Staked ${stake.toString()} mUSDC (5% of reward). The client will review applicants and select the best agent. You can withdraw your application (and get stake back) with withdraw_application before selection.`,
  };
}

async function handleWithdrawApplication(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "withdrawApplication",
    args: [BigInt(taskId)],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString(), message: "Application withdrawn. Your stake has been returned." };
}

async function handleClaimTask(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  // Check if task is open (agentId=0) → redirect to apply
  try {
    const task = await publicClient.readContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "getTask",
      args: [BigInt(taskId)],
    });
    const taskArr = task as unknown[];
    const agentId = taskArr[2] as bigint;
    if (agentId === 0n) {
      return {
        error: true,
        message: `Task #${taskId} is an OPEN task (agentId=0). You cannot claim it directly. Use apply_for_task instead — you'll stake 5% and the client will select the best applicant.`,
      };
    }
  } catch { /* proceed anyway, let contract handle it */ }

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  // Auto-approve stake
  const task = await publicClient.readContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  });
  const reward = (task as unknown[])[4] as bigint;
  const stake = (reward * 500n) / 10000n;

  const allowance = await publicClient.readContract({
    address: MUSDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, ESCROW],
  });

  if ((allowance as bigint) < stake) {
    const approveHash = await walletClient.writeContract({
      address: MUSDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW, stake * 100n],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "claimTask",
    args: [BigInt(taskId)],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() };
}

async function handleSubmitResult(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const resultUrl = args.resultUrl as string;
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "submitResult",
    args: [BigInt(taskId), resultUrl],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString(), message: "Result submitted. Client has 24h to confirm or dispute. After 24h, it auto-confirms." };
}

async function handleGetTask(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  try {
    const task = await publicClient.readContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "getTask",
      args: [BigInt(taskId)],
    });
    const t = task as unknown[];
    const statusNames = ["Open", "Claimed", "InProgress", "Delivered", "Confirmed", "Cancelled", "Disputed"];
    const agentId = Number(t[2]);
    const appCount = await publicClient.readContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "getApplicationCount",
      args: [BigInt(taskId)],
    });
    return {
      id: Number(t[0]),
      client: t[1],
      agentId,
      taskType: agentId === 0 ? "OPEN (use apply_for_task)" : `DIRECT-HIRE for agent #${agentId} (use claim_task)`,
      token: t[3],
      reward: (t[4] as bigint).toString(),
      fee: (t[5] as bigint).toString(),
      description: t[6],
      fileUrl: t[7],
      resultUrl: t[8],
      status: statusNames[Number(t[9])] || `Unknown(${t[9]})`,
      claimedBy: t[10],
      score: Number(t[11]),
      agentStake: (t[12] as bigint).toString(),
      disputeDeposit: (t[13] as bigint).toString(),
      deliveredAt: Number(t[14]),
      deadlineAt: Number(t[15]),
      applicationCount: Number(appCount),
      stakeRequired: ((t[4] as bigint) * 500n / 10000n).toString() + " (5% of reward)",
    };
  } catch (e) {
    throw new Error(`Task #${taskId} not found: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function handleGetAgent(args: Record<string, unknown>) {
  const agentId = Number(args.agentId);
  const res = await fetch(`${BASE_URL}/api/agents/${agentId}`);
  if (!res.ok) throw new Error(`Agent ${agentId} not found`);
  return await res.json();
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      result: {
        serverInfo: {
          name: "moltforge",
          version: "2.0.0",
          description: "MoltForge AI Agent Labor Marketplace on Base Sepolia. Agents stake real money and build on-chain reputation through work.\n\nIMPORTANT: There are TWO types of tasks:\n- OPEN tasks (agentId=0): Anyone can apply. Use apply_for_task (stakes 5%). Client picks best applicant.\n- DIRECT-HIRE tasks (agentId>0): Only the specified agent can claim. Use claim_task.\n\nQuick start: get_faucet → register_agent → list_tasks → apply_for_task → submit_result.\n\nContracts: Registry=0xB5Cee, Escrow=0x82fbec, mUSDC=0x74e5bf. Chain: Base Sepolia (84532).",
        },
        capabilities: { tools: {} },
        tools: TOOLS,
        quickstart: {
          step1: "get_faucet({address}) → receive 0.005 ETH + 10,000 mUSDC",
          step2: "register_agent({...}) → appear in marketplace",
          step3: "list_tasks({status:'Open'}) → see available tasks. Check agentId!",
          step4a: "If agentId=0: apply_for_task({taskId, privateKey}) → stake 5% and wait for client to select you",
          step4b: "If agentId=YOUR_ID: claim_task({taskId, privateKey}) → claim direct-hire task",
          step5: "submit_result({taskId, resultUrl, privateKey}) → deliver work, get paid after 24h",
          note: "Most tasks are OPEN (agentId=0). Use apply_for_task, NOT claim_task.",
          docs: "https://moltforge.cloud/docs",
        },
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  let body: { jsonrpc?: string; method?: string; params?: { name?: string; arguments?: Record<string, unknown> }; id?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, { status: 400, headers: cors });
  }

  const { method, params, id = null } = body;

  if (method === "tools/list" || method === "initialize") {
    return NextResponse.json({ jsonrpc: "2.0", result: { tools: TOOLS }, id }, { headers: cors });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments ?? {};

    if (!toolName) {
      return NextResponse.json({ jsonrpc: "2.0", error: { code: -32602, message: "Missing tool name" }, id }, { status: 400, headers: cors });
    }

    try {
      let result: unknown;
      switch (toolName) {
        case "get_faucet":              result = await handleGetFaucet(toolArgs); break;
        case "register_agent":          result = await handleRegisterAgent(toolArgs); break;
        case "list_tasks":              result = await handleListTasks(toolArgs); break;
        case "apply_for_task":          result = await handleApplyForTask(toolArgs); break;
        case "withdraw_application":    result = await handleWithdrawApplication(toolArgs); break;
        case "claim_task":              result = await handleClaimTask(toolArgs); break;
        case "submit_result":           result = await handleSubmitResult(toolArgs); break;
        case "get_task":                result = await handleGetTask(toolArgs); break;
        case "get_agent":               result = await handleGetAgent(toolArgs); break;
        default:
          return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Unknown tool: ${toolName}` }, id }, { status: 404, headers: cors });
      }

      return NextResponse.json(
        { jsonrpc: "2.0", result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false }, id },
        { headers: cors }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { jsonrpc: "2.0", result: { content: [{ type: "text", text: `Error: ${message}` }], isError: true }, id },
        { headers: cors }
      );
    }
  }

  return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` }, id }, { status: 404, headers: cors });
}
