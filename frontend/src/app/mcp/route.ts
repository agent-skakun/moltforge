import { NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  parseAbi,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { ADDRESSES } from "@/lib/contracts";

// ── Constants ────────────────────────────────────────────────────────────────

const RPC = "https://sepolia.base.org";
const REGISTRY = ADDRESSES.AgentRegistry;
const ESCROW = ADDRESSES.MoltForgeEscrow;
const MUSDC = ADDRESSES.USDC;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://moltforge.cloud";

const REGISTRY_ABI = parseAbi([
  "function registerAgent(address wallet, bytes32 agentId, string metadataURI, string webhookUrl) returns (uint256)",
]);
const ESCROW_ABI = parseAbi([
  "function claimTask(uint256 taskId)",
  "function applyForTask(uint256 taskId)",
  "function withdrawApplication(uint256 taskId)",
  "function selectAgent(uint256 taskId, uint256 applicationIndex)",
  "function submitResult(uint256 taskId, string resultUrl)",
  "function taskCount() view returns (uint256)",
  "function getTask(uint256 taskId) view returns ((uint256 id, address client, uint256 agentId, address token, uint256 reward, uint256 fee, string description, string fileUrl, string resultUrl, uint8 status, address claimedBy, uint8 score, uint64 createdAt, uint64 deadlineAt, uint256 agentStake, uint256 disputeDeposit, uint64 deliveredAt) task)",
  "function getApplications(uint256 taskId) view returns ((address applicant, uint256 agentId, uint256 stake, uint64 appliedAt)[])",
  "function getApplicationCount(uint256 taskId) view returns (uint256)",
]);
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

// ── Error decoder: translate contract reverts to human-readable messages ──────

const REVERT_MESSAGES: Record<string, { message: string; hint: string }> = {
  "0xc506f361": {
    message: "NotOpenTask — this task type doesn't match your action",
    hint: "If agentId=0 (open task), use apply_for_task instead of claim_task. If agentId>0 (direct-hire), use claim_task. See https://moltforge.cloud/docs#task-types",
  },
  "0x6c8a0fce": {
    message: "AgentMismatch — this direct-hire task is assigned to a different agent",
    hint: "This task was created for a specific agent (agentId > 0). Only that agent can claim it. Look for open tasks (agentId=0) or tasks matching your agent ID. See https://moltforge.cloud/docs#task-types",
  },
  "0x13d0ff59": {
    message: "WrongStatus — task is not in the right status for this action",
    hint: "Check task status with get_task tool. Open=can apply, Claimed=can submit, Delivered=can confirm/dispute. See https://moltforge.cloud/docs#task-types",
  },
  "0x82b42900": {
    message: "ZeroReward — reward or stake amount too small",
    hint: "Minimum stake for voting is 0.1% of task reward. For tasks, reward must be > 0. See https://moltforge.cloud/docs#staking",
  },
  "0x2e4c7d98": {
    message: "AlreadyApplied — you already applied for this task",
    hint: "You can only apply once per task. Use withdraw_application to remove your application, or wait for client to select.",
  },
  "0x9a7e4ab4": {
    message: "AlreadyVoted — you already voted on this dispute",
    hint: "Each validator can only vote once per dispute.",
  },
  "0xa1bff5e0": {
    message: "DeadlineInPast — the deadline must be in the future",
    hint: "Set deadlineHours > 0 when creating a task.",
  },
  "0x4d7e2640": {
    message: "NotClient — only the task creator can perform this action",
    hint: "Only the wallet that created the task can confirm, dispute, or select agents.",
  },
  "0x11c1b246": {
    message: "NotAgent — only the assigned agent can perform this action",
    hint: "Only the agent who was selected/claimed can submit results.",
  },
};

function decodeRevertError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // Check for known revert selectors
  for (const [selector, info] of Object.entries(REVERT_MESSAGES)) {
    if (msg.includes(selector)) {
      return `${info.message}\n\n💡 How to fix: ${info.hint}`;
    }
  }

  // Check for common viem error patterns
  if (msg.includes("insufficient funds")) {
    return "Insufficient ETH for gas. Get test ETH: call get_faucet with your wallet address. Docs: https://moltforge.cloud/docs#quick-start";
  }
  if (msg.includes("insufficient allowance") || msg.includes("ERC20: insufficient allowance")) {
    return "Insufficient mUSDC allowance. You need to approve mUSDC for the Escrow contract first. The apply_for_task and create_task tools do this automatically. If using cast send, run: cast send MUSDC_ADDRESS 'approve(address,uint256)' ESCROW_ADDRESS AMOUNT. Docs: https://moltforge.cloud/docs#staking";
  }
  if (msg.includes("transfer amount exceeds balance")) {
    return "Insufficient mUSDC balance. Get test tokens: call get_faucet with your wallet address, or mint directly: cast send 0x74e5...82 'mint(address,uint256)' YOUR_WALLET 10000000000. Docs: https://moltforge.cloud/docs#quick-start";
  }
  if (msg.includes("execution reverted")) {
    return `Transaction reverted. ${msg.slice(0, 200)}\n\n💡 Common causes: wrong task status, not authorized, insufficient balance/allowance. Check task details with get_task tool. Docs: https://moltforge.cloud/docs`;
  }

  return msg;
}

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
    name: "create_task",
    description: "Create a new task on MoltForge. REQUIRES: title, description, deliverables, and acceptanceCriteria. The reward is locked in escrow. Set agentId=0 for open tasks (agents apply) or agentId=N for direct-hire.",
    inputSchema: {
      type: "object",
      properties: {
        title:              { type: "string", description: "Task title" },
        description:        { type: "string", description: "Detailed description of what needs to be done" },
        deliverables:       { type: "string", description: "REQUIRED: What the agent must deliver (e.g. '3-page PDF report')" },
        acceptanceCriteria: { type: "string", description: "REQUIRED: How to judge if the work is done (e.g. 'Must include market size data and 5+ competitors')" },
        reward:             { type: "number", description: "Reward in USDC (e.g. 10 = 10 USDC)" },
        agentId:            { type: "number", description: "0 = open task (agents apply), >0 = direct-hire for specific agent" },
        deadlineHours:      { type: "number", description: "Deadline in hours from now (default: 24)" },
        privateKey:         { type: "string", description: "Hex private key (0x...)" },
      },
      required: ["title", "description", "deliverables", "acceptanceCriteria", "reward", "privateKey"],
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
    name: "select_agent",
    description: "Select an agent from applicants for an OPEN task (agentId=0). Only the task client can call this. Provide the applicationIndex (0-based) of the applicant to select. Selected agent gets the task; all others get their stakes returned.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:           { type: "number", description: "Task ID" },
        applicationIndex: { type: "number", description: "0-based index of the applicant to select" },
        privateKey:       { type: "string", description: "Hex private key of the client wallet (task creator)" },
      },
      required: ["taskId", "applicationIndex", "privateKey"],
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
  {
    name: "fetch_agent_card",
    description: "ERC-8004: Fetch the agent.json card from another agent's URL before interacting with it. Returns name, x402 support, on-chain registrations, and trust policy. Use this before delegating a task to an external agent.",
    inputSchema: {
      type: "object",
      properties: {
        agentUrl: { type: "string", description: "Base URL of the target agent (e.g. https://agent.moltforge.cloud)" },
      },
      required: ["agentUrl"],
    },
  },
  {
    name: "agent_interact",
    description: "ERC-8004 agent-to-agent interaction: fetches the target agent's card, verifies trust, then delegates a task query to it. Returns result from the remote agent. Use when you want to outsource a subtask to another registered agent.",
    inputSchema: {
      type: "object",
      properties: {
        agentUrl: { type: "string", description: "Base URL of the target agent" },
        query:    { type: "string", description: "The task query to send to the agent" },
      },
      required: ["agentUrl", "query"],
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

async function handleCreateTask(args: Record<string, unknown>) {
  const title = (args.title as string)?.trim();
  const description = (args.description as string)?.trim();
  const deliverables = (args.deliverables as string)?.trim();
  const acceptanceCriteria = (args.acceptanceCriteria as string)?.trim();
  const reward = Number(args.reward);
  const agentId = Number(args.agentId ?? 0);
  const deadlineHours = Number(args.deadlineHours ?? 24);
  const privateKey = args.privateKey as string;

  if (!title) throw new Error("title is required");
  if (!description) throw new Error("description is required");
  if (!deliverables) throw new Error("deliverables is required — what should the agent deliver?");
  if (!acceptanceCriteria) throw new Error("acceptanceCriteria is required — how do you judge if work is done?");
  if (!reward || reward <= 0) throw new Error("reward must be > 0 (USDC)");
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const descJson = JSON.stringify({
    title, description,
    resolution: { deliverables, acceptanceCriteria },
    createdAt: new Date().toISOString(),
    version: "2",
  });

  const rewardWei = BigInt(Math.round(reward * 1e6));
  const deadlineAt = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);

  // Auto-approve mUSDC
  const allowance = await publicClient.readContract({
    address: MUSDC, abi: ERC20_ABI, functionName: "allowance",
    args: [account.address, ESCROW],
  });
  if ((allowance as bigint) < rewardWei) {
    const approveHash = await walletClient.writeContract({
      address: MUSDC, abi: ERC20_ABI, functionName: "approve",
      args: [ESCROW, rewardWei * 10n],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const createAbi = parseAbi([
    "function createTask(address tokenAddr, uint256 reward, uint256 agentId, string description, string fileUrl, uint64 deadlineAt) returns (uint256)"
  ]);

  const hash = await walletClient.writeContract({
    address: ESCROW, abi: createAbi, functionName: "createTask",
    args: [MUSDC, rewardWei, BigInt(agentId), descJson, "", deadlineAt],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: true,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    taskType: agentId === 0 ? "OPEN (agents will apply)" : `DIRECT-HIRE for agent #${agentId}`,
    reward: `${reward} USDC`,
    deadline: new Date(Number(deadlineAt) * 1000).toISOString(),
    message: `Task created! ${agentId === 0 ? "Agents can now apply with apply_for_task." : `Agent #${agentId} can claim with claim_task.`}`,
  };
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
    }) as { reward: bigint; agentId: bigint };
    reward = task.reward;
    const agentId = task.agentId;
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

async function handleSelectAgent(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const applicationIndex = Number(args.applicationIndex);
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");
  if (isNaN(taskId) || taskId < 1) throw new Error("Invalid taskId");
  if (isNaN(applicationIndex) || applicationIndex < 0) throw new Error("applicationIndex must be >= 0");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "selectAgent",
    args: [BigInt(taskId), BigInt(applicationIndex)],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Read claimedBy after selection so agent knows which wallet to use for submitResult
  const taskAfter = await publicClient.readContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  }) as { claimedBy: string };

  return {
    success: true,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    claimedBy: taskAfter.claimedBy,
    message: `Agent selected for task #${taskId} (applicationIndex=${applicationIndex}). Task is now Claimed. Selected agent wallet: ${taskAfter.claimedBy}. Other applicants' stakes returned. IMPORTANT: the agent must call submit_result using the private key of wallet ${taskAfter.claimedBy}.`,
  };
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
    const taskCheck = task as { agentId: bigint };
    const agentId = taskCheck.agentId;
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
  const reward = (task as { reward: bigint }).reward;
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

  // Pre-flight: verify this wallet is the claimedBy agent for this task
  const task = await publicClient.readContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  }) as { claimedBy: string; status: number };

  const claimedBy = task.claimedBy.toLowerCase();
  const sender = account.address.toLowerCase();

  if (claimedBy === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Task #${taskId} has no assigned agent yet. Use claimTask or wait for selectAgent first.`);
  }
  if (claimedBy !== sender) {
    throw new Error(`NotAgent: task #${taskId} is assigned to ${task.claimedBy}, but you are submitting from ${account.address}. Use the private key of wallet ${task.claimedBy}.`);
  }

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
    }) as { id: bigint; client: string; agentId: bigint; token: string; reward: bigint; fee: bigint; description: string; fileUrl: string; resultUrl: string; status: number; claimedBy: string; score: number; createdAt: bigint; deadlineAt: bigint; agentStake: bigint; disputeDeposit: bigint; deliveredAt: bigint };
    const statusNames = ["Open", "Claimed", "Delivered", "Confirmed", "Disputed", "Resolved", "Cancelled"];
    const agentId = Number(task.agentId);
    const appCount = await publicClient.readContract({
      address: ESCROW,
      abi: ESCROW_ABI,
      functionName: "getApplicationCount",
      args: [BigInt(taskId)],
    });
    return {
      id: Number(task.id),
      client: task.client,
      agentId,
      taskType: agentId === 0 ? "OPEN (use apply_for_task)" : `DIRECT-HIRE for agent #${agentId} (use claim_task)`,
      token: task.token,
      reward: task.reward.toString(),
      fee: task.fee.toString(),
      description: task.description,
      fileUrl: task.fileUrl,
      resultUrl: task.resultUrl,
      status: statusNames[Number(task.status)] || `Unknown(${task.status})`,
      claimedBy: task.claimedBy,
      score: Number(task.score),
      createdAt: Number(task.createdAt),
      deadlineAt: Number(task.deadlineAt),
      agentStake: task.agentStake.toString(),
      disputeDeposit: task.disputeDeposit.toString(),
      deliveredAt: Number(task.deliveredAt),
      applicationCount: Number(appCount),
      stakeRequired: (task.reward * 500n / 10000n).toString() + " (5% of reward)",
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

async function handleFetchAgentCard(args: Record<string, unknown>) {
  const agentUrl = (args.agentUrl as string).replace(/\/$/, "");
  const res = await fetch(`${agentUrl}/agent.json`, {
    headers: { "User-Agent": "MoltForge-MCP/1.0 (ERC-8004)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Could not fetch agent card: HTTP ${res.status} from ${agentUrl}/agent.json`);
  const card = await res.json() as Record<string, unknown>;
  const isRegistered = Array.isArray(card.registrations) && (card.registrations as unknown[]).length > 0;
  return {
    ...card,
    _assessment: {
      erc8004: true,
      isRegistered,
      hasX402: card.x402Support === true,
      trusted: isRegistered,
      reason: isRegistered
        ? `Agent "${card.name ?? "unknown"}" is ERC-8004 compliant with on-chain registration`
        : "Agent card fetched but no on-chain registrations found",
    },
  };
}

async function handleAgentInteract(args: Record<string, unknown>) {
  const agentUrl = (args.agentUrl as string).replace(/\/$/, "");
  const query = args.query as string;
  const res = await fetch(`${agentUrl}/agent-interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "MoltForge-MCP/1.0 (ERC-8004)" },
    body: JSON.stringify({ agentUrl, query }),
    signal: AbortSignal.timeout(35000),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || `Agent interaction failed: HTTP ${res.status}`);
  return data;
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
          description: `MoltForge AI Agent Labor Marketplace on Base Sepolia. Agents stake real money and build on-chain reputation through work.\n\nIMPORTANT: There are TWO types of tasks:\n- OPEN tasks (agentId=0): Anyone can apply. Use apply_for_task (stakes 5%). Client picks best applicant with select_agent.\n- DIRECT-HIRE tasks (agentId>0): Only the specified agent can claim. Use claim_task.\n\nQuick start: get_faucet → register_agent → list_tasks → apply_for_task → (client: select_agent) → submit_result.\n\nContracts: Registry=${REGISTRY}, Escrow=${ESCROW}, mUSDC=${MUSDC}. Chain: Base Sepolia (84532).`,
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
        case "create_task":              result = await handleCreateTask(toolArgs); break;
        case "apply_for_task":          result = await handleApplyForTask(toolArgs); break;
        case "withdraw_application":    result = await handleWithdrawApplication(toolArgs); break;
        case "select_agent":            result = await handleSelectAgent(toolArgs); break;
        case "claim_task":              result = await handleClaimTask(toolArgs); break;
        case "submit_result":           result = await handleSubmitResult(toolArgs); break;
        case "get_task":                result = await handleGetTask(toolArgs); break;
        case "get_agent":               result = await handleGetAgent(toolArgs); break;
        case "fetch_agent_card":        result = await handleFetchAgentCard(toolArgs); break;
        case "agent_interact":          result = await handleAgentInteract(toolArgs); break;
        default:
          return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Unknown tool: ${toolName}` }, id }, { status: 404, headers: cors });
      }

      return NextResponse.json(
        { jsonrpc: "2.0", result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: false }, id },
        { headers: cors }
      );
    } catch (err) {
      const message = decodeRevertError(err);
      return NextResponse.json(
        { jsonrpc: "2.0", result: { content: [{ type: "text", text: `Error: ${message}` }], isError: true }, id },
        { headers: cors }
      );
    }
  }

  return NextResponse.json({ jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` }, id }, { status: 404, headers: cors });
}
