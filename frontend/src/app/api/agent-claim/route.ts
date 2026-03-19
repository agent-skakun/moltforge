import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { promises as fs } from "fs";
import path from "path";

// Storage: frontend/src/data/claims.json (flat file for hackathon MVP)
// For production: replace with a proper DB (Supabase, PlanetScale, etc.)
const CLAIMS_FILE = path.join(process.cwd(), "src", "data", "claims.json");

export interface AgentClaim {
  agentId: number;
  agentWallet: string;
  managerWallet: string;
  signature: string;
  message: string;
  claimedAt: number;
}

async function readClaims(): Promise<AgentClaim[]> {
  try {
    const raw = await fs.readFile(CLAIMS_FILE, "utf8");
    return JSON.parse(raw) as AgentClaim[];
  } catch {
    return [];
  }
}

async function writeClaims(claims: AgentClaim[]): Promise<void> {
  await fs.writeFile(CLAIMS_FILE, JSON.stringify(claims, null, 2), "utf8");
}

// GET /api/agent-claim?manager=0xUSER — list claims for this manager
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const manager = searchParams.get("manager");

  if (!manager || !isAddress(manager)) {
    return NextResponse.json({ error: "manager address required" }, { status: 400 });
  }

  const claims = await readClaims();
  const result = claims.filter(c => c.managerWallet.toLowerCase() === manager.toLowerCase());
  return NextResponse.json({ claims: result, total: result.length });
}

// POST /api/agent-claim — save a new claim
export async function POST(req: Request) {
  let body: Partial<AgentClaim>;
  try {
    body = await req.json() as Partial<AgentClaim>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agentId, agentWallet, managerWallet, signature, message } = body;

  if (!agentId || !agentWallet || !managerWallet || !signature || !message) {
    return NextResponse.json({ error: "Missing fields: agentId, agentWallet, managerWallet, signature, message" }, { status: 400 });
  }
  if (!isAddress(agentWallet) || !isAddress(managerWallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const claims = await readClaims();
  const existing = claims.findIndex(
    c => c.agentId === agentId && c.managerWallet.toLowerCase() === managerWallet.toLowerCase()
  );

  const newClaim: AgentClaim = {
    agentId: Number(agentId),
    agentWallet: agentWallet.toLowerCase(),
    managerWallet: managerWallet.toLowerCase(),
    signature,
    message,
    claimedAt: Date.now(),
  };

  if (existing >= 0) {
    // Update existing claim
    claims[existing] = newClaim;
  } else {
    claims.push(newClaim);
  }

  await writeClaims(claims);
  return NextResponse.json({ success: true, claim: newClaim });
}

// DELETE /api/agent-claim — remove a claim
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const manager = searchParams.get("manager");

  if (!agentId || !manager || !isAddress(manager)) {
    return NextResponse.json({ error: "agentId and manager required" }, { status: 400 });
  }

  const claims = await readClaims();
  const filtered = claims.filter(
    c => !(c.agentId === Number(agentId) && c.managerWallet.toLowerCase() === manager.toLowerCase())
  );

  if (filtered.length === claims.length) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  await writeClaims(filtered);
  return NextResponse.json({ success: true, removed: claims.length - filtered.length });
}
