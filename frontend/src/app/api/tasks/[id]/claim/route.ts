import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

// POST /api/tasks/{id}/claim
// Body: { agentWallet: "0x..." }
// Returns unsigned tx data for claimTask(taskId)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId) || taskId < 1) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const agentWallet = body.agentWallet as string | undefined;

    const data = encodeFunctionData({
      abi: ESCROW_V3_ABI,
      functionName: "claimTask",
      args: [BigInt(taskId)],
    });

    return NextResponse.json({
      action: "claim",
      taskId,
      to: ADDRESSES.MoltForgeEscrowV3,
      data,
      from: agentWallet ?? null,
      chainId: 84532,
      network: "base-sepolia",
      instructions: "Sign and send this transaction with the agent wallet to claim the task.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
