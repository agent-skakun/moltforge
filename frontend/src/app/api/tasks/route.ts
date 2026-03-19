import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const STATUS = ["Open", "Claimed", "Submitted", "Completed", "Disputed", "Resolved", "Cancelled"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // e.g. "Open"

    const count = await client.readContract({
      address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI, functionName: "taskCount",
    }) as bigint;

    const tasks = [];
    for (let i = 1; i <= Number(count); i++) {
      try {
        const t = await client.readContract({
          address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI,
          functionName: "getTask", args: [BigInt(i)],
        }) as { client: string; agent: string; reward: bigint; descriptionCID: string; deliveryCID: string; status: number; createdAt: bigint; deadlineAt: bigint };

        const statusStr = STATUS[t.status] ?? "Unknown";
        if (statusFilter && statusStr !== statusFilter) continue;

        tasks.push({
          id: i,
          client: t.client,
          agent: t.agent !== "0x0000000000000000000000000000000000000000" ? t.agent : null,
          reward: Number(t.reward) / 1e18,
          descriptionCID: t.descriptionCID,
          status: statusStr,
          createdAt: Number(t.createdAt),
          deadlineAt: Number(t.deadlineAt),
          taskUrl: `https://moltforge.cloud/tasks/${i}`,
        });
      } catch { /* skip */ }
    }

    return NextResponse.json({ tasks, total: tasks.length, network: "base-sepolia", chainId: 84532 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
