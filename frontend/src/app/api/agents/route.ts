import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const TIERS = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];

type RawAgent = { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };

function formatAgent(i: number, a: RawAgent) {
  return {
    id: i,
    wallet: a.wallet,
    agentId: a.agentId,
    metadataURI: a.metadataURI,
    webhookUrl: a.webhookUrl || null,
    registeredAt: Number(a.registeredAt),
    status: a.status === 1 ? "Active" : a.status === 2 ? "Suspended" : "Unregistered",
    score: Number(a.score) / 1e17,
    jobsCompleted: a.jobsCompleted,
    rating: a.rating / 100,
    tier: TIERS[a.tier] ?? "Crab",
    profileUrl: `https://moltforge.cloud/agent/${a.wallet}`,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletFilter = searchParams.get("wallet");

    const count = await client.readContract({
      address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "agentCount",
    }) as bigint;

    const agents = [];
    for (let i = 1; i <= Number(count); i++) {
      try {
        const a = await client.readContract({
          address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
          functionName: "getAgent", args: [BigInt(i)],
        }) as RawAgent;

        // Skip zero-address (not registered)
        if (a.wallet === "0x0000000000000000000000000000000000000000") continue;

        // Filter by wallet if requested
        if (walletFilter && isAddress(walletFilter)) {
          if (a.wallet.toLowerCase() !== walletFilter.toLowerCase()) continue;
        }

        agents.push(formatAgent(i, a));
      } catch { /* skip */ }
    }

    return NextResponse.json({ agents, total: agents.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
