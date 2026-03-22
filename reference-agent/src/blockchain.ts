import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { type Config } from "./config";

const ESCROW_V3_ABI = [
  {
    type: "function",
    name: "submitResult",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "resultUrl", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",              type: "uint256" },
          { name: "client",         type: "address" },
          { name: "agentId",        type: "uint256" },
          { name: "token",          type: "address" },
          { name: "reward",         type: "uint256" },
          { name: "fee",            type: "uint256" },
          { name: "description",    type: "string"  },
          { name: "fileUrl",        type: "string"  },
          { name: "resultUrl",      type: "string"  },
          { name: "status",         type: "uint8"   },
          { name: "claimedBy",      type: "address" },
          { name: "score",          type: "uint8"   },
          { name: "createdAt",      type: "uint64"  },
          { name: "deadlineAt",     type: "uint64"  },
          { name: "agentStake",     type: "uint256" },
          { name: "disputeDeposit", type: "uint256" },
          { name: "deliveredAt",    type: "uint64"  },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "applyForTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getOpenTasks",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit",  type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id",         type: "uint256" },
          { name: "agentId",    type: "uint256" },
          { name: "reward",     type: "uint256" },
          { name: "deadlineAt", type: "uint64"  },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

// ERC-20 minimal ABI for stake approval
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export interface TaskInfo {
  id: bigint;
  client: Address;
  agentId: bigint;
  token: Address;
  reward: bigint;
  fee: bigint;
  description: string;
  fileUrl: string;
  resultUrl: string;
  status: number; // 0=Open,1=Claimed,2=Delivered,3=Confirmed,4=Disputed,5=Resolved,6=Cancelled
  claimedBy: Address;
  score: number;
  createdAt: bigint;
  deadlineAt: bigint;
  agentStake: bigint;
  disputeDeposit: bigint;
  deliveredAt: bigint;
}

// Agent self-assessment: can we handle this task?
export function canHandleTask(task: TaskInfo, agentId: bigint): {
  canHandle: boolean;
  reason: string;
} {
  // Check task is Open or Claimed-by-us
  if (task.status !== 0 && task.status !== 1) {
    return { canHandle: false, reason: `wrong status: ${task.status}` };
  }

  // Direct-hire: check agentId matches (0 = open task, anyone can apply)
  if (task.agentId !== 0n && task.agentId !== agentId) {
    return { canHandle: false, reason: `direct-hire for agent ${task.agentId}, we are ${agentId}` };
  }

  // Check deadline: need at least 2 minutes to execute
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (task.deadlineAt !== 0n && task.deadlineAt < now + 120n) {
    return { canHandle: false, reason: "deadline too close (< 2 min)" };
  }

  // Check description has a query we can process
  let desc = task.description;
  let parsedDesc: Record<string, unknown> | null = null;
  try { parsedDesc = JSON.parse(task.description); desc = (parsedDesc?.title as string) ?? task.description; } catch { /* raw string */ }
  if (!desc || desc.trim().length < 3) {
    return { canHandle: false, reason: "empty or too-short description" };
  }

  // HARD CHECK: task must be valid JSON with resolution.deliverables + resolution.acceptanceCriteria
  // Raw string descriptions (no JSON) are rejected — no way to objectively verify completion
  if (!parsedDesc) {
    return { canHandle: false, reason: "description is not JSON — missing resolution fields" };
  }
  const resolution = parsedDesc.resolution as Record<string, unknown> | undefined;
  if (!resolution) {
    return { canHandle: false, reason: "missing resolution (no deliverables/acceptanceCriteria)" };
  }
  const deliverables = (resolution.deliverables as string | undefined)?.trim();
  const criteria = (resolution.acceptanceCriteria as string | undefined)?.trim();
  if (!deliverables || deliverables.length < 3) {
    return { canHandle: false, reason: "missing deliverables — cannot objectively complete" };
  }
  if (!criteria || criteria.length < 3) {
    return { canHandle: false, reason: "missing acceptanceCriteria — cannot objectively complete" };
  }

  return { canHandle: true, reason: "ok" };
}

const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAgentIdByWallet",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentExtended",
    inputs: [{ name: "numericId", type: "uint256" }],
    outputs: [
      {
        name: "agent",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "agentId", type: "bytes32" },
          { name: "metadataURI", type: "string" },
          { name: "webhookUrl", type: "string" },
          { name: "registeredAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "score", type: "uint256" },
          { name: "jobsCompleted", type: "uint32" },
          { name: "rating", type: "uint32" },
          { name: "tier", type: "uint8" },
        ],
      },
      { name: "avatarHash", type: "bytes32" },
      { name: "skills", type: "string[]" },
      { name: "tools", type: "string[]" },
      { name: "_agentUrl", type: "string" },
    ],
    stateMutability: "view",
  },
] as const;

export interface AgentExtended {
  numericId: bigint;
  wallet: Address;
  agentId: `0x${string}`;
  metadataURI: string;
  webhookUrl: string;
  registeredAt: bigint;
  status: number;
  score: bigint;
  jobsCompleted: number;
  rating: number;
  tier: number;
  avatarHash: `0x${string}`;
  skills: readonly string[];
  tools: readonly string[];
  agentUrl: string;
}

export function createBlockchainClient(config: Config) {
  // Support both Base mainnet and Sepolia
  const isSepolia = config.rpcUrl.includes("sepolia");
  const chain = isSepolia ? baseSepolia : base;

  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  async function getAgentId(wallet?: Address): Promise<bigint> {
    return client.readContract({
      address: config.registryAddress,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentIdByWallet",
      args: [wallet ?? config.walletAddress],
    });
  }

  async function getAgentExtended(wallet?: Address): Promise<AgentExtended | null> {
    try {
      const numericId = await getAgentId(wallet);
      if (numericId === 0n) return null;

      const result = await client.readContract({
        address: config.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgentExtended",
        args: [numericId],
      }) as readonly [
        { wallet: Address; agentId: `0x${string}`; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number },
        `0x${string}`,
        readonly string[],
        readonly string[],
        string
      ];

      const [agent, avatarHash, skills, tools, agentUrl] = result;
      return {
        numericId,
        wallet: agent.wallet,
        agentId: agent.agentId,
        metadataURI: agent.metadataURI,
        webhookUrl: agent.webhookUrl,
        registeredAt: agent.registeredAt,
        status: agent.status,
        score: agent.score,
        jobsCompleted: agent.jobsCompleted,
        rating: agent.rating,
        tier: agent.tier,
        avatarHash,
        skills,
        tools,
        agentUrl,
      };
    } catch {
      return null;
    }
  }

  async function submitResult(taskId: bigint, resultUrl: string): Promise<`0x${string}`> {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
    if (!privateKey || privateKey.length < 10) {
      throw new Error("AGENT_PRIVATE_KEY not set — cannot submit on-chain");
    }
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(config.rpcUrl),
    });
    const txHash = await walletClient.writeContract({
      address: config.escrowAddress,
      abi: ESCROW_V3_ABI,
      functionName: "submitResult",
      args: [taskId, resultUrl],
    });
    console.log(`[on-chain] submitResult(taskId=${taskId}) → txHash: ${txHash}`);
    return txHash;
  }

  async function getTask(taskId: bigint): Promise<TaskInfo> {
    const result = await client.readContract({
      address: config.escrowAddress,
      abi: ESCROW_V3_ABI,
      functionName: "getTask",
      args: [taskId],
    }) as {
      id: bigint; client: Address; agentId: bigint; token: Address;
      reward: bigint; fee: bigint; description: string; fileUrl: string; resultUrl: string;
      status: number; claimedBy: Address; score: number; createdAt: bigint;
      deadlineAt: bigint; agentStake: bigint; disputeDeposit: bigint; deliveredAt: bigint;
    };
    return result;
  }

  async function claimTask(taskId: bigint): Promise<`0x${string}`> {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
    if (!privateKey || privateKey.length < 10) {
      throw new Error("AGENT_PRIVATE_KEY not set — cannot claim on-chain");
    }
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) });

    // Fetch task to know stake amount and token
    const task = await getTask(taskId);
    const AGENT_STAKE_BPS = 500n; // 5%
    const stake = (task.reward * AGENT_STAKE_BPS) / 10000n;

    // Approve stake
    if (stake > 0n) {
      const approveTx = await walletClient.writeContract({
        address: task.token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [config.escrowAddress, stake],
      });
      console.log(`[on-chain] approve stake ${stake} → ${approveTx}`);
      // Wait a couple seconds for approval to land
      await new Promise(r => setTimeout(r, 3000));
    }

    const txHash = await walletClient.writeContract({
      address: config.escrowAddress,
      abi: ESCROW_V3_ABI,
      functionName: "claimTask",
      args: [taskId],
    });
    console.log(`[on-chain] claimTask(taskId=${taskId}) → txHash: ${txHash}`);
    return txHash;
  }

  async function applyForTask(taskId: bigint): Promise<`0x${string}`> {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}` | undefined;
    if (!privateKey || privateKey.length < 10) throw new Error("AGENT_PRIVATE_KEY not set");
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) });

    // applyForTask requires agent stake deposit (same as claimTask)
    const task = await getTask(taskId);
    const AGENT_STAKE_BPS = 500n;
    const stake = (task.reward * AGENT_STAKE_BPS) / 10000n;
    if (stake > 0n) {
      await walletClient.writeContract({
        address: task.token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [config.escrowAddress, stake],
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    const txHash = await walletClient.writeContract({
      address: config.escrowAddress,
      abi: ESCROW_V3_ABI,
      functionName: "applyForTask",
      args: [taskId],
    });
    console.log(`[on-chain] applyForTask(taskId=${taskId}) → ${txHash}`);
    return txHash;
  }

  async function getOpenTasks(offset = 0n, limit = 20n): Promise<Array<{ id: bigint; agentId: bigint; reward: bigint; deadlineAt: bigint }>> {
    try {
      // Read taskCount and scan backwards for Open tasks
      const taskCount = await client.readContract({
        address: config.escrowAddress,
        abi: [{ type: "function", name: "taskCount", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }] as const,
        functionName: "taskCount",
      }) as bigint;

      const results: Array<{ id: bigint; agentId: bigint; reward: bigint; deadlineAt: bigint }> = [];
      const start = taskCount > 0n ? taskCount : 0n;
      const checked = 0n;

      // Scan from latest backwards
      for (let i = start; i >= 1n && BigInt(results.length) < limit; i--) {
        try {
          const task = await getTask(i);
          if (task.status === 0) {  // Open
            results.push({ id: i, agentId: task.agentId, reward: task.reward, deadlineAt: task.deadlineAt });
          }
        } catch { continue; }
      }
      return results;
    } catch (e) {
      console.warn("[blockchain] getOpenTasks error:", (e as Error).message?.slice(0, 80));
      return [];
    }
  }

  return { client, getAgentId, getAgentExtended, submitResult, getTask, claimTask, applyForTask, getOpenTasks };
}

// ─── ERC-8004 Trust Check ──────────────────────────────────────────────────────

const TRUST_REGISTRY_ADDRESS = "0xaB0009F91e5457fF5aA9cFB539820Bd3F74C713e" as const;
const MERIT_SBT_ADDRESS = "0xe3C5b5a24fB481302C13E5e069ddD77E700C2113" as const;
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

const TRUST_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAgentIdByWallet",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentExtended",
    inputs: [{ name: "numericId", type: "uint256" }],
    outputs: [
      {
        name: "agent",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "agentId", type: "bytes32" },
          { name: "metadataURI", type: "string" },
          { name: "webhookUrl", type: "string" },
          { name: "registeredAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "score", type: "uint256" },
          { name: "jobsCompleted", type: "uint32" },
          { name: "rating", type: "uint32" },
          { name: "tier", type: "uint8" },
        ],
      },
      { name: "avatarHash", type: "bytes32" },
      { name: "skills", type: "string[]" },
      { name: "tools", type: "string[]" },
      { name: "_agentUrl", type: "string" },
    ],
    stateMutability: "view",
  },
] as const;

const MERIT_SBT_ABI = [
  {
    type: "function",
    name: "getReputation",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function checkClientTrust(
  clientWallet: string,
  _config?: any,
): Promise<{ trusted: boolean; reason: string; score: number }> {
  if (!clientWallet || !/^0x[0-9a-fA-F]{40}$/.test(clientWallet)) {
    return { trusted: true, reason: "no wallet provided", score: 0 };
  }

  const wallet = clientWallet as Address;
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  let erc8004Compliant = false;
  let agentUrl = "";

  // Step 1: Check AgentRegistry for ERC-8004 compliance
  try {
    const numericId = await client.readContract({
      address: TRUST_REGISTRY_ADDRESS,
      abi: TRUST_REGISTRY_ABI,
      functionName: "getAgentIdByWallet",
      args: [wallet],
    });

    if (numericId > 0n) {
      const result = await client.readContract({
        address: TRUST_REGISTRY_ADDRESS,
        abi: TRUST_REGISTRY_ABI,
        functionName: "getAgentExtended",
        args: [numericId],
      });
      const [, , , , fetchedUrl] = result as readonly [any, any, any, any, string];
      agentUrl = fetchedUrl;

      if (agentUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const resp = await fetch(`${agentUrl}/agent.json`, { signal: controller.signal });
          clearTimeout(timeout);
          if (resp.ok) {
            const agentJson = await resp.json() as Record<string, any>;
            if (
              typeof agentJson.type === "string" &&
              agentJson.type.toLowerCase().includes("eip-8004") &&
              agentJson.active === true
            ) {
              erc8004Compliant = true;
            }
          }
        } catch {
          // agent.json fetch failed — not fatal
        }
      }
    }
  } catch {
    // Registry lookup failed — not fatal
  }

  // Step 2: Check MeritSBT reputation
  let score = 0;
  try {
    score = Number(
      await client.readContract({
        address: MERIT_SBT_ADDRESS,
        abi: MERIT_SBT_ABI,
        functionName: "getReputation",
        args: [wallet],
      }),
    );
  } catch {
    try {
      score = Number(
        await client.readContract({
          address: MERIT_SBT_ADDRESS,
          abi: MERIT_SBT_ABI,
          functionName: "balanceOf",
          args: [wallet],
        }),
      );
    } catch {
      score = 0;
    }
  }

  const parts: string[] = [];
  parts.push(erc8004Compliant ? "erc8004:compliant" : "erc8004:not-found");
  parts.push(`reputation:${score}`);
  if (agentUrl) parts.push(`url:${agentUrl}`);

  return { trusted: true, reason: parts.join(", "), score };
}
