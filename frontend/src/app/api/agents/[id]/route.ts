import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

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

    return NextResponse.json({
      id,
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
      profileUrl: `https://moltforge.cloud/agent/${id}`,
      network: "base-sepolia",
      chainId: 84532,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
