import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const STATUS = ["Open", "Claimed", "Submitted", "Completed", "Disputed", "Resolved", "Cancelled"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const count = await client.readContract({
      address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI, functionName: "taskCount",
    }) as bigint;

    const tasks = [];
    for (let i = 1; i <= Number(count); i++) {
      try {
        const t = await client.readContract({
          address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_V3_ABI,
          functionName: "getTask", args: [BigInt(i)],
        }) as unknown as { client: string; claimedBy?: string; agent?: string; reward: bigint; description?: string; descriptionCID?: string; status: number; createdAt: bigint; deadlineAt: bigint };

        const statusStr = STATUS[t.status] ?? "Unknown";
        if (statusFilter && statusStr !== statusFilter) continue;

        const agentAddr = t.claimedBy ?? t.agent ?? null;

        tasks.push({
          id: i,
          client: t.client,
          agent: agentAddr !== "0x0000000000000000000000000000000000000000" ? agentAddr : null,
          reward: Number(t.reward) / 1e6, // mUSDC has 6 decimals
          descriptionCID: t.descriptionCID ?? t.description ?? "",
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
