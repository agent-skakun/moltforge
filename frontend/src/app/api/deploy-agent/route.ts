import { NextResponse } from "next/server";

// ─── Simulated deploy — all agents point to the shared reference agent ────────
// Real isolated deploy is V2 post-hackathon.

const REFERENCE_AGENT_URL = "https://agent.moltforge.cloud";

interface DeployRequest {
  agentName?: string;
  agentNumericId?: string;
  walletAddress?: string;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  let body: DeployRequest = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const { agentName, agentNumericId } = body;

  // Simulate ~2s server processing
  await new Promise(r => setTimeout(r, 2000));

  const slug = agentNumericId
    ? `mf-agent-${agentNumericId}`
    : `mf-agent-${(agentName ?? "agent").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 24)}`;

  return NextResponse.json({
    ok: true,
    agentUrl: REFERENCE_AGENT_URL,
    domain: "agent.moltforge.cloud",
    serviceId: `sim-${slug}`,
    dashboardUrl: `https://moltforge.cloud/dashboard`,
    simulated: true,
  });
}
