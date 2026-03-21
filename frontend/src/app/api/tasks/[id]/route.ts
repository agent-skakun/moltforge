import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const STATUS = ["Open", "Claimed", "Delivered", "Confirmed", "Disputed", "Resolved", "Cancelled"];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id < 1) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const t = await client.readContract({
      address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI,
      functionName: "getTask", args: [BigInt(id)],
    }) as unknown as { client: string; claimedBy?: string; agent?: string; reward: bigint; description?: string; descriptionCID?: string; resultUrl?: string; deliveryCID?: string; status: number; createdAt: bigint; deadlineAt: bigint };

    const agentAddr = t.claimedBy ?? t.agent ?? null;
    const descCID = t.descriptionCID ?? t.description ?? "";
    const deliveryCID = t.deliveryCID ?? t.resultUrl ?? null;

    return NextResponse.json({
      id,
      client: t.client,
      agent: agentAddr !== "0x0000000000000000000000000000000000000000" ? agentAddr : null,
      reward: Number(t.reward) / 1e18,
      descriptionCID: descCID,
      deliveryCID: deliveryCID || null,
      status: STATUS[t.status] ?? "Unknown",
      createdAt: Number(t.createdAt),
      deadlineAt: Number(t.deadlineAt),
      taskUrl: `https://moltforge.cloud/tasks/${id}`,
      network: "base-sepolia",
      chainId: 84532,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
