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
] as const;

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

  return { client, getAgentId, getAgentExtended, submitResult };
}

// ─── ERC-8004 Trust Check ──────────────────────────────────────────────────────

const TRUST_REGISTRY_ADDRESS = "0xB5Cee4234D4770C241a09d228F757C6473408827" as const;
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
