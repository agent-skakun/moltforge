import { NextResponse } from "next/server";
import { isAddress, recoverMessageAddress, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { promises as fs } from "fs";
import path from "path";

const CLAIMS_FILE = path.join(process.cwd(), "src", "data", "claims.json");

interface AgentClaim {
  agentId: number;
  agentWallet: string;
  managerWallet: string;
  signature: string;
  message: string;
  claimedAt: number;
  method?: "agent-signature" | "owner-wallet";
}

async function readClaims(): Promise<AgentClaim[]> {
  try { return JSON.parse(await fs.readFile(CLAIMS_FILE, "utf8")) as AgentClaim[]; }
  catch { return []; }
}
async function writeClaims(claims: AgentClaim[]) {
  await fs.writeFile(CLAIMS_FILE, JSON.stringify(claims, null, 2), "utf8");
}

const rpcClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

// POST /api/agent-claim/confirm
// Body: { agentId, managerWallet, agentSignature? }
// Two modes:
//   - agentSignature provided → verify agent signed the authorization message (Level 2)
//   - no agentSignature       → check ownerWallet in agent metadata (Level 1)
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
    // ── Level 2: verify agent signed the authorization message ──────────────
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
    // ── Level 1: check ownerWallet in agent metadata ─────────────────────────
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

  // ── Save confirmed claim ──────────────────────────────────────────────────
  const claims = await readClaims();
  const existing = claims.findIndex(c => c.agentId === id && c.managerWallet === manager);
  const record: AgentClaim = {
    agentId: id,
    agentWallet,
    managerWallet: manager,
    signature: String(agentSignature ?? "owner-wallet-verified"),
    message: agentSignature
      ? `I authorize ${manager} to manage MoltForge agent #${id}`
      : `ownerWallet match in metadata`,
    claimedAt: Date.now(),
    method,
  };

  if (existing >= 0) claims[existing] = record;
  else claims.push(record);
  await writeClaims(claims);

  return NextResponse.json({ success: true, method, claim: record });
}
