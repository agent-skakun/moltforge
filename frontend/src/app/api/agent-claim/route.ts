import { NextResponse } from "next/server";
import { isAddress, verifyMessage, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

// ── Supabase client (no fs, works on Vercel serverless) ──────────────────────
const SUPABASE_URL = "https://lfswbuoryxktimrzualq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc3didW9yeXhrdGltcnp1YWxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg0OTM2OCwiZXhwIjoyMDg5NDI1MzY4fQ.l6nz4CeVqsnZalmTEE-ihRSKuI9aUM3xXO0hrL8IWqE";

const sbHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export interface AgentClaim {
  agentId: number;
  agentWallet: string;
  managerWallet: string;
  signature: string;
  message: string;
  claimedAt: number;
  verified: boolean;
}

async function getClaims(manager: string): Promise<AgentClaim[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_claims?manager_wallet=eq.${manager.toLowerCase()}&order=claimed_at.desc`,
    { headers: sbHeaders }
  );
  if (!res.ok) return [];
  const rows = await res.json() as Array<{
    agent_id: number; agent_wallet: string; manager_wallet: string;
    signature: string; message: string; claimed_at: number; method: string;
  }>;
  return rows.map(r => ({
    agentId: r.agent_id,
    agentWallet: r.agent_wallet,
    managerWallet: r.manager_wallet,
    signature: r.signature,
    message: r.message,
    claimedAt: r.claimed_at,
    verified: true,
  }));
}

async function upsertClaim(claim: Omit<AgentClaim, "verified"> & { method?: string }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_claims`, {
    method: "POST",
    headers: { ...sbHeaders, "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      agent_id: claim.agentId,
      agent_wallet: claim.agentWallet.toLowerCase(),
      manager_wallet: claim.managerWallet.toLowerCase(),
      signature: claim.signature,
      message: claim.message,
      method: claim.method ?? "agent-signature",
      claimed_at: claim.claimedAt,
    }),
  });
  return res.ok;
}

async function deleteClaim(agentId: number, manager: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_claims?agent_id=eq.${agentId}&manager_wallet=eq.${manager.toLowerCase()}`,
    { method: "DELETE", headers: sbHeaders }
  );
  return res.ok;
}

// ── On-chain ─────────────────────────────────────────────────────────────────
const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

async function resolveAgentWallet(agentId: number): Promise<string | null> {
  try {
    const agent = await publicClient.readContract({
      address: ADDRESSES.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [BigInt(agentId)],
    }) as { wallet: string };
    if (!agent?.wallet || agent.wallet === "0x0000000000000000000000000000000000000000") return null;
    return agent.wallet.toLowerCase();
  } catch { return null; }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const manager = searchParams.get("manager");
  if (!manager || !isAddress(manager)) {
    return NextResponse.json({ error: "manager address required" }, { status: 400 });
  }
  const claims = await getClaims(manager);
  return NextResponse.json({ claims });
}

export async function POST(req: Request) {
  let body: { agentId?: number; agentWallet?: string; managerWallet?: string; signature?: string; message?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { agentId, agentWallet, managerWallet, signature, message } = body;
  if (!agentId || !agentWallet || !managerWallet || !signature || !message) {
    return NextResponse.json({ error: "Missing fields: agentId, agentWallet, managerWallet, signature, message" }, { status: 400 });
  }
  if (!isAddress(agentWallet) || !isAddress(managerWallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // Verify on-chain wallet
  const onChainWallet = await resolveAgentWallet(Number(agentId));
  if (!onChainWallet) {
    return NextResponse.json({ error: `Agent #${agentId} not found on-chain` }, { status: 404 });
  }
  if (onChainWallet !== agentWallet.toLowerCase()) {
    return NextResponse.json({
      error: `agentWallet ${agentWallet} does not match on-chain wallet ${onChainWallet}. Use the correct agent wallet.`
    }, { status: 403 });
  }

  // Verify signature
  const expectedMessage = `I authorize ${managerWallet} to manage MoltForge agent #${agentId}`;
  if (message.toLowerCase() !== expectedMessage.toLowerCase()) {
    return NextResponse.json({ error: `Wrong message. Must be exactly: "${expectedMessage}"` }, { status: 400 });
  }

  let verified = false;
  try {
    verified = await verifyMessage({
      address: agentWallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "Could not verify signature" }, { status: 400 });
  }

  if (!verified) {
    return NextResponse.json({
      error: "Signature verification failed — sign the message with the agent's private key."
    }, { status: 403 });
  }

  const claim = {
    agentId: Number(agentId),
    agentWallet: agentWallet.toLowerCase(),
    managerWallet: managerWallet.toLowerCase(),
    signature,
    message,
    claimedAt: Date.now(),
    method: "agent-signature" as const,
  };

  const saved = await upsertClaim(claim);
  if (!saved) {
    return NextResponse.json({ error: "Failed to save claim to database" }, { status: 500 });
  }

  return NextResponse.json({ success: true, verified: true, claim: { ...claim, verified: true } });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = Number(searchParams.get("agentId"));
  const manager = searchParams.get("manager");
  if (!agentId || !manager) {
    return NextResponse.json({ error: "agentId and manager required" }, { status: 400 });
  }
  const ok = await deleteClaim(agentId, manager);
  return NextResponse.json({ success: ok });
}
