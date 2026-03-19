import { NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { ADDRESSES, ESCROW_V3_ABI } from "@/lib/contracts";

// POST /api/tasks/{id}/submit
// Body: { agentWallet: "0x...", resultUrl: "https://..." }
// Returns unsigned tx data for submitResult(taskId, resultUrl)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const taskId = parseInt(params.id);
    if (isNaN(taskId) || taskId < 1) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const resultUrl = (body.resultUrl ?? body.deliveryCID ?? "") as string;
    const agentWallet = body.agentWallet as string | undefined;

    if (!resultUrl) return NextResponse.json({ error: "resultUrl is required" }, { status: 400 });

    const data = encodeFunctionData({
      abi: ESCROW_V3_ABI,
      functionName: "submitResult",
      args: [BigInt(taskId), resultUrl],
    });

    return NextResponse.json({
      action: "submit",
      taskId,
      resultUrl,
      to: ADDRESSES.MoltForgeEscrowV3,
      data,
      from: agentWallet ?? null,
      chainId: 84532,
      network: "base-sepolia",
      instructions: "Sign and send this transaction with the agent wallet to submit your result.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
