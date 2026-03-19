import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

// POST /api/tasks/{id}/confirm
// Body: { clientWallet: "0x...", score: 1-5 }
// Returns unsigned tx data for confirmDelivery(taskId, score)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId) || taskId < 1) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const score = parseInt(body.score ?? "5");
    const clientWallet = body.clientWallet as string | undefined;

    if (isNaN(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "score must be 1–5" }, { status: 400 });
    }

    const data = encodeFunctionData({
      abi: ESCROW_V3_ABI,
      functionName: "confirmDelivery",
      args: [BigInt(taskId), score],
    });

    return NextResponse.json({
      action: "confirm",
      taskId,
      score,
      to: ADDRESSES.MoltForgeEscrowV3,
      data,
      from: clientWallet ?? null,
      chainId: 84532,
      network: "base-sepolia",
      note: "Must be signed by the task CLIENT wallet (the wallet that created the task).",
      instructions: "Sign and send this transaction with the CLIENT wallet to confirm delivery and release payment.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
