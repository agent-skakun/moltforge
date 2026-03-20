import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";

const REGISTRY_ABI = parseAbi([
  "function getAgentExtended(address wallet) view returns (bytes32 agentId, uint256 numericId, address walletAddr, string metadataURI, string agentUrl, string[] skills, string[] tools, uint256 rating, uint256 jobsCompleted, uint256 jobsFailed, uint256 tier, bytes32 avatarHash, uint256 createdAt)",
]);

export interface TrustAssessment {
  trusted: boolean;
  reason: string;
  score: number;
  rating: number;
  jobsCompleted: number;
  tier: number;
  agentName: string;
}

export async function checkAgentTrust(
  agentAddress: string,
  registryAddress: string,
  rpcUrl: string,
  minRating = 200,
  minJobs = 1,
): Promise<TrustAssessment> {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

  try {
    const data = await client.readContract({
      address: registryAddress as `0x${string}`,
      abi: REGISTRY_ABI,
      functionName: "getAgentExtended",
      args: [agentAddress as `0x${string}`],
    });

    const [, numericId, , metadataURI, , , , rating, jobsCompleted, , tier] = data;

    // Parse agent name from metadataURI
    let agentName = "Unknown";
    try {
      if (typeof metadataURI === "string" && metadataURI.startsWith("data:application/json;base64,")) {
        const json = JSON.parse(Buffer.from(metadataURI.split(",")[1], "base64").toString());
        agentName = json.name ?? "Unknown";
      }
    } catch { /* ignore */ }

    const ratingNum = Number(rating);
    const jobsNum = Number(jobsCompleted);
    const tierNum = Number(tier);

    if (Number(numericId) === 0) {
      return { trusted: false, reason: "Agent not registered in AgentRegistry", score: 0, rating: 0, jobsCompleted: 0, tier: 0, agentName: "Unregistered" };
    }

    const trusted = ratingNum >= minRating && jobsNum >= minJobs;
    const reason = trusted
      ? `Agent ${agentName} meets trust threshold (rating=${ratingNum / 100}, jobs=${jobsNum})`
      : `Agent ${agentName} below threshold: rating=${ratingNum / 100} (need ${minRating / 100}), jobs=${jobsNum} (need ${minJobs})`;

    const score = Math.min(100, (ratingNum / 5) + (jobsNum * 10) + (tierNum * 15));

    return { trusted, reason, score, rating: ratingNum, jobsCompleted: jobsNum, tier: tierNum, agentName };
  } catch (err) {
    return { trusted: false, reason: `Failed to check agent: ${(err as Error).message}`, score: 0, rating: 0, jobsCompleted: 0, tier: 0, agentName: "Error" };
  }
}
