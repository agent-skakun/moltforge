import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_V2_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const TIERS = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];

type RawAgent = { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };
type Reputation = { weightedScore: bigint; totalJobs: bigint; totalVolume: bigint; tier: number };

function formatAgent(i: number, a: RawAgent, rep?: Reputation) {
  // MeritSBTV2 is source of truth for jobs/tier/score; fall back to AgentRegistry
  const jobs = rep && rep.totalJobs > 0n ? Number(rep.totalJobs) : a.jobsCompleted;
  const tier = rep !== undefined ? (TIERS[rep.tier] ?? "Crab") : (TIERS[a.tier] ?? "Crab");
  // weightedScore from MeritSBTV2 is ×100 (e.g. 484 = 4.84 avg)
  const score = rep && rep.weightedScore > 0n
    ? Number(rep.weightedScore) / 100
    : Number(a.score) / 1e18;
  // merit: volume in USDC (6 decimals)
  const meritVolume = rep && rep.totalVolume > 0n
    ? `${(Number(rep.totalVolume) / 1e6).toFixed(2)} USDC`
    : null;

  return {
    id: i,
    wallet: a.wallet,
    agentId: a.agentId,
    metadataURI: a.metadataURI,
    webhookUrl: a.webhookUrl || null,
    registeredAt: Number(a.registeredAt),
    status: a.status === 1 ? "Active" : a.status === 2 ? "Suspended" : "Unregistered",
    score,
    jobsCompleted: jobs,
    jobs,
    rating: a.rating / 100,
    tier,
    merit: meritVolume,
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

    const total = Number(count);

    // Fetch all agents + reputations in parallel via multicall
    const agentCalls = Array.from({ length: total }, (_, i) => ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent" as const,
      args: [BigInt(i + 1)] as const,
    }));

    const repCalls = Array.from({ length: total }, (_, i) => ({
      address: ADDRESSES.MeritSBTV2 as `0x${string}`,
      abi: MERIT_SBT_V2_ABI,
      functionName: "getReputation" as const,
      args: [BigInt(i + 1)] as const,
    }));

    const [agentsRaw, repsRaw] = await Promise.all([
      client.multicall({ contracts: agentCalls }),
      client.multicall({ contracts: repCalls }),
    ]);

    const agents = [];
    for (let i = 0; i < total; i++) {
      try {
        const ar = agentsRaw[i];
        if (ar.status !== "success") continue;
        const a = ar.result as RawAgent;
        if (a.wallet === "0x0000000000000000000000000000000000000000") continue;
        if (walletFilter && isAddress(walletFilter)) {
          if (a.wallet.toLowerCase() !== walletFilter.toLowerCase()) continue;
        }

        let rep: Reputation | undefined;
        const rr = repsRaw[i];
        if (rr?.status === "success" && rr.result) {
          const [ws, tj, tv, t] = rr.result as [bigint, bigint, bigint, number];
          rep = { weightedScore: ws, totalJobs: tj, totalVolume: tv, tier: Number(t) };
        }

        agents.push(formatAgent(i + 1, a, rep));
      } catch { /* skip */ }
    }

    return NextResponse.json({ agents, total: agents.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

