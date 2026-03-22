import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_V2_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const TIERS = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];

type RawAgent = { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };
type Reputation = { weightedScore: bigint; totalJobs: bigint; tier: number };

function formatAgent(i: number, a: RawAgent, rep?: Reputation, xpWei?: bigint) {
  const jobs = rep && rep.totalJobs > 0n ? Number(rep.totalJobs) : a.jobsCompleted;
  const tier = rep !== undefined ? (TIERS[rep.tier] ?? "Crab") : (TIERS[a.tier] ?? "Crab");
  const score = rep && rep.weightedScore > 0n
    ? Number(rep.weightedScore) / 100
    : Number(a.score) / 1e18;
  // merit = XP from getXP() / 1e18
  let merit: string | null = null;
  if (xpWei && xpWei > 0n) {
    const xpNum = Number(xpWei) / 1e18;
    merit = xpNum < 10 ? `${xpNum.toFixed(2)} XP` : `${xpNum.toFixed(1)} XP`;
  }

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
    merit,
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

    const xpCalls = Array.from({ length: total }, (_, i) => ({
      address: ADDRESSES.MeritSBTV2 as `0x${string}`,
      abi: MERIT_SBT_V2_ABI,
      functionName: "getXP" as const,
      args: [BigInt(i + 1)] as const,
    }));

    const [agentsRaw, repsRaw, xpsRaw] = await Promise.all([
      client.multicall({ contracts: agentCalls }),
      client.multicall({ contracts: repCalls }),
      client.multicall({ contracts: xpCalls }),
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
          const [ws, tj, , t] = rr.result as [bigint, bigint, bigint, number];
          rep = { weightedScore: ws, totalJobs: tj, tier: Number(t) };
        }

        let xpWei: bigint | undefined;
        const xr = xpsRaw[i];
        if (xr?.status === "success" && xr.result) {
          const [xp] = xr.result as [bigint, number];
          xpWei = xp;
        }

        agents.push(formatAgent(i + 1, a, rep, xpWei));
      } catch { /* skip */ }
    }

    return NextResponse.json({ agents, total: agents.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

