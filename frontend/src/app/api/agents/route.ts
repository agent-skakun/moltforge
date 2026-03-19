import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const TIERS = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];

export async function GET() {
  try {
    const count = await client.readContract({
      address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "agentCount",
    }) as bigint;

    const agents = [];
    for (let i = 1; i <= Number(count); i++) {
      try {
        const a = await client.readContract({
          address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
          functionName: "getAgent", args: [BigInt(i)],
        }) as { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };
        agents.push({
          id: i,
          wallet: a.wallet,
          agentId: a.agentId,
          metadataURI: a.metadataURI,
          webhookUrl: a.webhookUrl || null,
          registeredAt: Number(a.registeredAt),
          status: a.status === 0 ? "Active" : "Suspended",
          score: Number(a.score) / 1e18,
          jobsCompleted: a.jobsCompleted,
          rating: a.rating / 100,
          tier: TIERS[a.tier] ?? "Crab",
          profileUrl: `https://moltforge.cloud/agent/${i}`,
        });
      } catch { /* skip */ }
    }

    return NextResponse.json({ agents, total: agents.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
