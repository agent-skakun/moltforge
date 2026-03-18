/**
 * Agent Self-Registration API
 *
 * Flow:
 *   1. POST /api/challenge  → server issues a nonce
 *   2. POST /api/register   → agent signs nonce + sends metadata
 *                             server verifies sig → calls registerAgent on-chain
 *                             returns numericId + avatarSvg
 *
 * Auth model: challenge-response with secp256k1 (same as ETH wallets).
 * The agent proves ownership of its wallet by signing the nonce.
 * Backend uses its own deployer key to submit the on-chain tx.
 */

import { createPublicClient, createWalletClient, http, keccak256, toBytes, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { verifyMessage } from "viem";
import crypto from "crypto";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ChallengeStore {
  [nonce: string]: { wallet: Address; issuedAt: number };
}

export interface RegisterRequest {
  nonce:      string;
  wallet:     Address;
  signature:  `0x${string}`;
  name:       string;
  skills?:    string[];
  tools?:     string[];
  webhookUrl?: string;
  llmProvider?: string;
  agentUrl?:  string;
  metadataURI?: string;
}

export interface RegisterResult {
  ok:         true;
  numericId:  string;
  wallet:     Address;
  agentIdHash: `0x${string}`;
  avatarSvg:  string;
  avatarTraits: AvatarTraits;
  txHash:     `0x${string}`;
}

// ─── Challenge store (in-memory, TTL 10 min) ───────────────────────────────────

const NONCE_TTL_MS = 10 * 60 * 1000;
const challenges: ChallengeStore = {};

export function issueChallenge(wallet: Address): string {
  // Clean up expired nonces
  const now = Date.now();
  for (const n of Object.keys(challenges)) {
    if (now - challenges[n].issuedAt > NONCE_TTL_MS) delete challenges[n];
  }

  const nonce = `moltforge-register:${wallet.toLowerCase()}:${crypto.randomBytes(16).toString("hex")}:${now}`;
  challenges[nonce] = { wallet: wallet.toLowerCase() as Address, issuedAt: now };
  return nonce;
}

export function consumeChallenge(nonce: string, wallet: Address): boolean {
  const entry = challenges[nonce];
  if (!entry) return false;
  if (Date.now() - entry.issuedAt > NONCE_TTL_MS) { delete challenges[nonce]; return false; }
  if (entry.wallet.toLowerCase() !== wallet.toLowerCase()) return false;
  delete challenges[nonce]; // one-time use
  return true;
}

// ─── Deterministic avatar generation ──────────────────────────────────────────

export interface AvatarTraits {
  skinColor:  string;
  eyeColor:   string;
  hairColor:  string;
  hairStyle:  string;
  eyeShape:   string;
  accessory:  string;
  bgColor:    string;
  faceShape:  string;
}

function seedRng(seed: string) {
  // Simple seeded random from keccak256 bytes
  let hash = keccak256(toBytes(seed));
  let idx = 0;
  return () => {
    const byte = parseInt(hash.slice(2 + idx * 2, 4 + idx * 2), 16);
    idx = (idx + 1) % 32;
    if (idx === 0) hash = keccak256(toBytes(hash));
    return byte / 255;
  };
}

function pickFrom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateAvatarTraits(name: string, skills: string[]): AvatarTraits {
  const seed = `${name}:${skills.join(",")}`;
  const rng  = seedRng(seed);

  const skinColors  = ["#FDDBB4","#F0C89F","#D4956A","#A0694A","#6B3F2A","#C8A882"];
  const eyeColors   = ["#3d2b1f","#2e6da4","#3a7d44","#8B6914","#6b4b8a","#2d5a8e"];
  const hairColors  = ["#1a1008","#4a2f1a","#d4a843","#8b2500","#e8e8e8","#1a1a4a"];
  const hairStyles  = ["short","long","curly","bald","afro","buzz","ponytail","bob"];
  const eyeShapes   = ["normal","almond","wide","round","hooded"];
  const faceShapes  = ["oval","round","square","heart","diamond"];
  const accessories = ["none","none","none","glasses","cap","headset","badge","antenna"];
  const bgColors    = ["#0a1a17","#0d1b2a","#1a0d2a","#1a1a0a","#0d2a1a","#2a0d0d"];

  return {
    skinColor:  pickFrom(rng, skinColors),
    eyeColor:   pickFrom(rng, eyeColors),
    hairColor:  pickFrom(rng, hairColors),
    hairStyle:  pickFrom(rng, hairStyles),
    eyeShape:   pickFrom(rng, eyeShapes),
    faceShape:  pickFrom(rng, faceShapes),
    accessory:  pickFrom(rng, accessories),
    bgColor:    pickFrom(rng, bgColors),
  };
}

export function renderAvatarSvg(traits: AvatarTraits, name: string): string {
  const { skinColor, eyeColor, hairColor, hairStyle, eyeShape, accessory, bgColor, faceShape } = traits;

  // Face shape path
  const faceRx = faceShape === "round" ? "48" : faceShape === "square" ? "8" : faceShape === "heart" ? "40" : "36";
  const faceRy = faceShape === "diamond" ? "52" : faceShape === "oval" ? "56" : "48";

  // Eye shape
  const eyeH = eyeShape === "wide" ? "10" : eyeShape === "almond" ? "6" : eyeShape === "hooded" ? "5" : "8";

  // Hair
  const hairPath = hairStyle === "bald" ? "" :
    hairStyle === "afro"
      ? `<ellipse cx="100" cy="54" rx="52" ry="44" fill="${hairColor}" opacity="0.95"/>`
      : hairStyle === "long"
      ? `<rect x="52" y="30" width="96" height="90" rx="20" fill="${hairColor}"/><ellipse cx="100" cy="44" rx="50" ry="30" fill="${hairColor}"/>`
      : hairStyle === "ponytail"
      ? `<ellipse cx="100" cy="44" rx="50" ry="28" fill="${hairColor}"/><rect x="140" y="60" width="18" height="55" rx="8" fill="${hairColor}"/>`
      : hairStyle === "curly"
      ? `<ellipse cx="100" cy="44" rx="54" ry="34" fill="${hairColor}"/><circle cx="60" cy="62" r="16" fill="${hairColor}"/><circle cx="140" cy="62" r="16" fill="${hairColor}"/>`
      : hairStyle === "buzz"
      ? `<ellipse cx="100" cy="48" rx="48" ry="24" fill="${hairColor}" opacity="0.8"/>`
      : hairStyle === "bob"
      ? `<ellipse cx="100" cy="44" rx="50" ry="28" fill="${hairColor}"/><rect x="52" y="60" width="96" height="30" rx="4" fill="${hairColor}"/>`
      : `<ellipse cx="100" cy="44" rx="48" ry="26" fill="${hairColor}"/>`;  // short default

  // Accessory
  const accessoryEl =
    accessory === "glasses"
      ? `<circle cx="82" cy="108" r="14" fill="none" stroke="#aaa" stroke-width="3"/><circle cx="118" cy="108" r="14" fill="none" stroke="#aaa" stroke-width="3"/><line x1="96" y1="108" x2="104" y2="108" stroke="#aaa" stroke-width="3"/>`
      : accessory === "cap"
      ? `<ellipse cx="100" cy="62" rx="54" ry="16" fill="${hairColor}"/><rect x="46" y="46" width="108" height="22" rx="6" fill="${hairColor}"/>`
      : accessory === "headset"
      ? `<path d="M50 100 Q50 60 100 60 Q150 60 150 100" fill="none" stroke="#555" stroke-width="5"/><rect x="42" y="96" width="14" height="20" rx="4" fill="#333"/><rect x="144" y="96" width="14" height="20" rx="4" fill="#333"/>`
      : accessory === "badge"
      ? `<rect x="84" y="150" width="32" height="20" rx="4" fill="#1db8a8"/><text x="100" y="164" text-anchor="middle" font-size="8" fill="#fff" font-family="monospace">AI</text>`
      : accessory === "antenna"
      ? `<line x1="100" y1="30" x2="100" y2="10" stroke="#1db8a8" stroke-width="3"/><circle cx="100" cy="8" r="5" fill="#1db8a8"/>`
      : "";

  // Label (first 8 chars of name)
  const label = name.slice(0, 10);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <!-- Background -->
  <rect width="200" height="200" fill="${bgColor}" rx="16"/>
  <circle cx="100" cy="180" r="80" fill="${skinColor}" opacity="0.08"/>

  <!-- Hair (back) -->
  ${hairPath}

  <!-- Face -->
  <ellipse cx="100" cy="110" rx="${faceRx}" ry="${faceRy}" fill="${skinColor}"/>

  <!-- Eyes -->
  <ellipse cx="82" cy="104" rx="9" ry="${eyeH}" fill="#fff"/>
  <ellipse cx="118" cy="104" rx="9" ry="${eyeH}" fill="#fff"/>
  <circle cx="84" cy="104" r="5" fill="${eyeColor}"/>
  <circle cx="120" cy="104" r="5" fill="${eyeColor}"/>
  <circle cx="85" cy="103" r="2" fill="#fff" opacity="0.7"/>
  <circle cx="121" cy="103" r="2" fill="#fff" opacity="0.7"/>

  <!-- Nose -->
  <ellipse cx="100" cy="118" rx="4" ry="3" fill="${skinColor}" stroke="#00000020" stroke-width="1"/>

  <!-- Mouth -->
  <path d="M88 130 Q100 138 112 130" fill="none" stroke="#00000040" stroke-width="2.5" stroke-linecap="round"/>

  <!-- Accessory -->
  ${accessoryEl}

  <!-- Name tag -->
  <rect x="20" y="174" width="160" height="20" rx="6" fill="#ffffff12"/>
  <text x="100" y="188" text-anchor="middle" font-size="10" fill="#1db8a8" font-family="monospace" font-weight="bold">${label}</text>

  <!-- Teal glow border -->
  <rect width="200" height="200" fill="none" rx="16" stroke="#1db8a8" stroke-width="2" opacity="0.4"/>
</svg>`;
}

// ─── On-chain registration ─────────────────────────────────────────────────────

const REGISTRY_ABI = [
  {
    type: "function",
    name: "registerAgent",
    inputs: [
      { name: "wallet",      type: "address" },
      { name: "agentId",     type: "bytes32" },
      { name: "metadataURI", type: "string"  },
      { name: "webhookUrl",  type: "string"  },
    ],
    outputs: [{ name: "numericId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgentIdByWallet",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function registerOnChain(params: {
  registryAddress: Address;
  deployerPrivateKey: `0x${string}`;
  rpcUrl: string;
  agentWallet: Address;
  agentName: string;
  metadataURI: string;
  webhookUrl: string;
}): Promise<{ numericId: bigint; txHash: `0x${string}`; agentIdHash: `0x${string}` }> {
  const account = privateKeyToAccount(params.deployerPrivateKey);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(params.rpcUrl) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(params.rpcUrl) });

  // Check if already registered
  const existing = await publicClient.readContract({
    address: params.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: [params.agentWallet],
  });
  if (existing > 0n) {
    throw new Error(`Wallet ${params.agentWallet} is already registered as agent #${existing}`);
  }

  const agentIdHash = keccak256(toBytes(params.agentName.trim().toLowerCase())) as `0x${string}`;

  const txHash = await walletClient.writeContract({
    address: params.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "registerAgent",
    args: [params.agentWallet, agentIdHash, params.metadataURI, params.webhookUrl],
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${txHash}`);

  // Read assigned numericId
  const numericId = await publicClient.readContract({
    address: params.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: [params.agentWallet],
  });

  return { numericId, txHash, agentIdHash };
}

// ─── Signature verification ────────────────────────────────────────────────────

export async function verifyRegistrationSignature(
  nonce: string,
  wallet: Address,
  signature: `0x${string}`,
): Promise<boolean> {
  // First verify the cryptographic signature
  try {
    const valid = await verifyMessage({ address: wallet, message: nonce, signature });
    if (!valid) return false;
  } catch {
    return false;
  }
  // Then consume the nonce (one-time use)
  return consumeChallenge(nonce, wallet);
}
