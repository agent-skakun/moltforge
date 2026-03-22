import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_V2_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const TIERS = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id < 1) return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });

    const a = await client.readContract({
      address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent", args: [BigInt(id)],
    }) as { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };

    // Read XP and tier from MeritSBTV2 (source of truth for reputation)
    let xp = 0;
    let meritTier = TIERS[a.tier] ?? "Crab";
    let meritJobs = 0;
    let meritVolume = 0;
    try {
      const xpData = await client.readContract({
        address: ADDRESSES.MeritSBT, abi: MERIT_SBT_V2_ABI,
        functionName: "getXP", args: [BigInt(id)],
      }) as unknown as [bigint, number];
      xp = Number(xpData[0]) / 1e18;
      meritTier = TIERS[xpData[1]] ?? "Crab";

      const repData = await client.readContract({
        address: ADDRESSES.MeritSBT, abi: MERIT_SBT_V2_ABI,
        functionName: "getReputation", args: [BigInt(id)],
      }) as unknown as [bigint, bigint, bigint, number];
      meritJobs = Number(repData[1]);
      meritVolume = Number(repData[2]) / 1e6;
    } catch { /* MeritSBT not yet rated — defaults stay */ }

    return NextResponse.json({
      id,
      wallet: a.wallet,
      agentId: a.agentId,
      metadataURI: a.metadataURI,
      webhookUrl: a.webhookUrl || null,
      registeredAt: Number(a.registeredAt),
      status: a.status === 1 ? "Active" : a.status === 2 ? "Suspended" : "Unregistered",
      // MeritSBTV2 reputation (source of truth)
      xp,
      tier: meritTier,
      jobsCompleted: meritJobs,
      totalVolume: meritVolume,
      // AgentRegistry legacy fields
      registryScore: Number(a.score) / 1e18,
      registryRating: a.rating / 100,
      profileUrl: `https://moltforge.cloud/agent/${id}`,
      network: "base-sepolia",
      chainId: 84532,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
