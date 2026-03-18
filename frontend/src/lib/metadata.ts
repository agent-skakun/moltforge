/**
 * Agent metadata standard — MoltForge IPFS JSON schema
 *
 * {
 *   "name": "BALABOLIK",
 *   "description": "Copywriter AI agent",
 *   "version": "1.0",
 *   "agentUrl": "https://balabolik.example.com",
 *   "llmProvider": "anthropic",
 *   "specialization": "content",
 *   "tone": "creative",
 *   "skills": ["content/copywriting.md"],
 *   "tools": ["websearch"],
 *   "capabilities": ["text generation", "social media"],
 *   "avatar": { "hash": "0x1234...", "svg": "<svg...>" }
 * }
 */

export interface AgentMetadata {
  name?: string;
  description?: string;
  version?: string;
  agentUrl?: string;
  llmProvider?: string;
  specialization?: string;
  tone?: string;
  skills?: string[];
  tools?: string[];
  capabilities?: string[];
  avatar?: { hash?: string; svg?: string };
  // legacy fields
  webhookUrl?: string;
  selfRegistered?: boolean;
}

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

// In-memory cache to avoid repeated fetches for same URI
const metaCache = new Map<string, AgentMetadata>();

export async function parseMetadataURI(uri: string): Promise<AgentMetadata> {
  if (!uri) return {};

  // Cache hit
  const cached = metaCache.get(uri);
  if (cached) return cached;

  try {
    let json: AgentMetadata | null = null;

    // ── data:application/json;base64,... ──────────────────────────────────
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1];
      if (b64) json = JSON.parse(atob(b64));

    // ── ipfs://CID ────────────────────────────────────────────────────────
    } else if (uri.startsWith("ipfs://")) {
      const cid = uri.slice(7);
      for (const gw of IPFS_GATEWAYS) {
        try {
          const res = await fetch(gw + cid, { signal: AbortSignal.timeout(5000) });
          if (res.ok) { json = await res.json(); break; }
        } catch { /* try next gateway */ }
      }

    // ── https:// ──────────────────────────────────────────────────────────
    } else if (uri.startsWith("https://") || uri.startsWith("http://")) {
      const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
      if (res.ok) json = await res.json();
    }

    const result: AgentMetadata = json ?? {};
    metaCache.set(uri, result);
    return result;
  } catch {
    return {};
  }
}

/** Sync fallback — only works for data: URIs (no fetch needed) */
export function parseMetadataSync(uri: string): AgentMetadata {
  if (!uri) return {};
  try {
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1];
      if (b64) return JSON.parse(atob(b64));
    }
  } catch { /* ignore */ }
  return {};
}

/** Pin JSON to IPFS via w3s.link public CAR upload (no API key needed for small payloads) */
export async function pinToIPFS(metadata: AgentMetadata): Promise<string | null> {
  try {
    const body = JSON.stringify(metadata);
    // Use nft.storage compatible endpoint (public, no auth for <1MB)
    const res = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as { value?: { cid?: string }; cid?: string };
      const cid = data?.value?.cid ?? data?.cid;
      if (cid) return `ipfs://${cid}`;
    }
  } catch { /* fallback to data: URI */ }
  return null;
}

/** Build a data: URI fallback when IPFS is unavailable */
export function metadataToDataURI(metadata: AgentMetadata): string {
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}
