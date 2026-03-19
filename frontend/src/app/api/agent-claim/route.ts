import { NextResponse } from "next/server";
import { isAddress, verifyMessage, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { promises as fs } from "fs";
import path from "path";

const CLAIMS_FILE = path.join(process.cwd(), "src", "data", "claims.json");
const REGISTRY = "0xB5Cee4234D4770C241a09d228F757C6473408827" as const;
const GET_AGENT_ABI = [{ name: "getAgent", type: "function", inputs: [{ name: "numericId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "wallet", type: "address" }, { name: "agentId", type: "bytes32" }, { name: "metadataURI", type: "string" }, { name: "webhookUrl", type: "string" }, { name: "registeredAt", type: "uint64" }, { name: "status", type: "uint8" }, { name: "score", type: "uint256" }, { name: "jobsCompleted", type: "uint32" }, { name: "rating", type: "uint32" }, { name: "tier", type: "uint8" }] }], stateMutability: "view" }] as const;
const GET_COUNT_ABI = [{ name: "agentCount", type: "function", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }] as const;

const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

export interface AgentClaim {
  agentId: number;
  agentWallet: string;
  managerWallet: string;
  signature: string;
  message: string;
  claimedAt: number;
  verified: boolean;
}

async function readClaims(): Promise<AgentClaim[]> {
  try {
    const raw = await fs.readFile(CLAIMS_FILE, "utf8");
    return JSON.parse(raw) as AgentClaim[];
  } catch { return []; }
}

async function writeClaims(claims: AgentClaim[]): Promise<void> {
  await fs.mkdir(path.dirname(CLAIMS_FILE), { recursive: true });
  await fs.writeFile(CLAIMS_FILE, JSON.stringify(claims, null, 2), "utf8");
}

async function resolveAgentWallet(agentId: number): Promise<string | null> {
  try {
    const agent = await publicClient.readContract({ address: REGISTRY, abi: GET_AGENT_ABI, functionName: "getAgent", args: [BigInt(agentId)] }) as { wallet: string };
    if (!agent?.wallet || agent.wallet === "0x0000000000000000000000000000000000000000") return null;
    return agent.wallet.toLowerCase();
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const manager = searchParams.get("manager");
  if (!manager || !isAddress(manager)) return NextResponse.json({ error: "manager address required" }, { status: 400 });
  const claims = await readClaims();
  return NextResponse.json({ claims: claims.filter(c => c.managerWallet.toLowerCase() === manager.toLowerCase()) });
}

export async function POST(req: Request) {
  let body: { agentId?: number; agentWallet?: string; managerWallet?: string; signature?: string; message?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { agentId, agentWallet, managerWallet, signature, message } = body;
  if (!agentId || !agentWallet || !managerWallet || !signature || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isAddress(agentWallet) || !isAddress(managerWallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  // ── Verify signature: recovered address must match agent's on-chain wallet ──
  const onChainWallet = await resolveAgentWallet(Number(agentId));
  if (!onChainWallet) {
    return NextResponse.json({ error: `Agent #${agentId} not found on-chain` }, { status: 404 });
  }

  let verified = false;
  try {
    const recovered = await verifyMessage({ address: agentWallet as `0x${string}`, message, signature: signature as `0x${string}` });
    verified = recovered;
    if (recovered && onChainWallet !== agentWallet.toLowerCase()) {
      return NextResponse.json({
        error: `Signature is valid but agentWallet ${agentWallet} does not match on-chain wallet ${onChainWallet}. Use the correct agent wallet.`
      }, { status: 403 });
    }
    if (!recovered) {
      return NextResponse.json({ error: "Signature verification failed — the signature does not match agentWallet. Sign the message with the agent's private key." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Could not verify signature" }, { status: 400 });
  }

  // Expected message format
  const expectedMessage = `I authorize ${managerWallet} to manage MoltForge agent #${agentId}`;
  if (message.toLowerCase() !== expectedMessage.toLowerCase()) {
    return NextResponse.json({ error: `Wrong message. Must be exactly: "${expectedMessage}"` }, { status: 400 });
  }

  const claims = await readClaims();
  const existing = claims.findIndex(c => c.agentId === Number(agentId) && c.managerWallet.toLowerCase() === managerWallet.toLowerCase());
  const newClaim: AgentClaim = { agentId: Number(agentId), agentWallet: agentWallet.toLowerCase(), managerWallet: managerWallet.toLowerCase(), signature, message, claimedAt: Date.now(), verified };

  if (existing >= 0) claims[existing] = newClaim; else claims.push(newClaim);
  await writeClaims(claims);
  return NextResponse.json({ success: true, verified: true, claim: newClaim });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = Number(searchParams.get("agentId"));
  const manager = searchParams.get("manager");
  if (!agentId || !manager) return NextResponse.json({ error: "agentId and manager required" }, { status: 400 });
  const claims = await readClaims();
  const filtered = claims.filter(c => !(c.agentId === agentId && c.managerWallet.toLowerCase() === manager.toLowerCase()));
  await writeClaims(filtered);
  return NextResponse.json({ success: true });
}
