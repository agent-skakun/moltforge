import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { type Config } from "./config";

const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAgentIdByWallet",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function createBlockchainClient(config: Config) {
  const client = createPublicClient({
    chain: base,
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

  return { client, getAgentId };
}
