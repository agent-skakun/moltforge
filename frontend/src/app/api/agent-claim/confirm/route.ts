import { NextResponse } from "next/server";
import { isAddress, recoverMessageAddress, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

const SUPABASE_URL = "https://lfswbuoryxktimrzualq.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc3didW9yeXhrdGltcnp1YWxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg0OTM2OCwiZXhwIjoyMDg5NDI1MzY4fQ.l6nz4CeVqsnZalmTEE-ihRSKuI9aUM3xXO0hrL8IWqE";

async function upsertClaim(row: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/agent_claims`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
  return res.ok;
}

const rpcClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

export async function POST(req: Request) {
  let body: { agentId?: unknown; managerWallet?: unknown; agentSignature?: unknown };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { agentId, managerWallet, agentSignature } = body;

  if (!agentId || !managerWallet || !isAddress(String(managerWallet))) {
    return NextResponse.json({ error: "agentId and managerWallet required" }, { status: 400 });
  }

  const id = Number(agentId);
  const manager = String(managerWallet).toLowerCase();

  // Fetch agent from on-chain
  let agentWallet: string;
  let metadataURI: string;
  try {
    const data = await rpcClient.readContract({
      address: ADDRESSES.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent",
      args: [BigInt(id)],
    }) as { wallet: string; metadataURI: string };
    agentWallet = data.wallet.toLowerCase();
    metadataURI = data.metadataURI;
  } catch {
    return NextResponse.json({ error: "Agent not found on-chain" }, { status: 404 });
  }

  let method: "agent-signature" | "owner-wallet";

  if (agentSignature) {
    // Level 2: verify agent signed the authorization message
    const expectedMsg = `I authorize ${manager} to manage MoltForge agent #${id}`;
    let recovered: string;
    try {
      recovered = (await recoverMessageAddress({
        message: expectedMsg,
        signature: String(agentSignature) as `0x${string}`,
      })).toLowerCase();
    } catch {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    if (recovered !== agentWallet) {
      return NextResponse.json({
        error: `Signature mismatch. Expected signer: ${agentWallet}, got: ${recovered}`,
      }, { status: 403 });
    }
    method = "agent-signature";
  } else {
    // Level 1: check ownerWallet in agent metadata
    let ownerInMeta: string | undefined;
    try {
      if (metadataURI.startsWith("data:application/json;base64,")) {
        const decoded = JSON.parse(atob(metadataURI.split(",")[1])) as { ownerWallet?: string };
        ownerInMeta = decoded.ownerWallet?.toLowerCase();
      } else if (metadataURI.startsWith("https://") || metadataURI.startsWith("http://")) {
        const r = await fetch(metadataURI, { signal: AbortSignal.timeout(5000) });
        const decoded = await r.json() as { ownerWallet?: string };
        ownerInMeta = decoded.ownerWallet?.toLowerCase();
      }
    } catch { /* ignore */ }

    if (!ownerInMeta) {
      return NextResponse.json({ error: "No ownerWallet in agent metadata. Provide agentSignature for Level 2 verification." }, { status: 403 });
    }
    if (ownerInMeta !== manager) {
      return NextResponse.json({ error: `ownerWallet mismatch. Metadata has: ${ownerInMeta}` }, { status: 403 });
    }
    method = "owner-wallet";
  }

  // Save confirmed claim to Supabase
  const saved = await upsertClaim({
    agent_id: id,
    agent_wallet: agentWallet,
    manager_wallet: manager,
    signature: String(agentSignature ?? "owner-wallet-verified"),
    message: agentSignature
      ? `I authorize ${manager} to manage MoltForge agent #${id}`
      : `ownerWallet match in metadata`,
    method,
    claimed_at: Date.now(),
  });

  if (!saved) {
    return NextResponse.json({ error: "Failed to save claim" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    method,
    claim: { agentId: id, agentWallet, managerWallet: manager, method },
  });
}
