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
