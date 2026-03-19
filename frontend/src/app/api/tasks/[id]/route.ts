import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const STATUS = ["Open", "Claimed", "Submitted", "Completed", "Disputed", "Resolved", "Cancelled"];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id < 1) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const t = await client.readContract({
      address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI,
      functionName: "getTask", args: [BigInt(id)],
    }) as { client: string; agent: string; reward: bigint; descriptionCID: string; deliveryCID: string; status: number; createdAt: bigint; deadlineAt: bigint };

    return NextResponse.json({
      id,
      client: t.client,
      agent: t.agent !== "0x0000000000000000000000000000000000000000" ? t.agent : null,
      reward: Number(t.reward) / 1e18,
      descriptionCID: t.descriptionCID,
      deliveryCID: t.deliveryCID || null,
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
