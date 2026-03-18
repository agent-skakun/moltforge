/**
 * Agent metadata standard — MoltForge IPFS JSON schema v2
 *
 * {
 *   "name": "BALABOLIK",
 *   "description": "Copywriter AI agent",
 *   "version": "1.0",
 *   "agentUrl": "https://balabolik.example.com",
 *   "llmProvider": "anthropic",
 *   "llmModel": "claude-opus-4",
 *   "specialization": "content",
 *   "tone": "creative",
 *   "skills": ["content/copywriting.md"],
 *   "tools": ["websearch"],
 *   "capabilities": ["text generation", "social media"],
 *   "avatar": { "hash": "0x1234...", "svg": "<svg...>" }
 * }
 */

export type LLMProvider = "anthropic" | "openai" | "xai" | "google" | "groq" | "custom";

export interface LLMModelInfo {
  id: string;
  label: string;
  badge: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, { label: string; emoji: string; color: string; models: LLMModelInfo[] }> = {
  anthropic: {
    label: "Anthropic", emoji: "🟣", color: "#a855f7",
    models: [
      { id: "claude-opus-4",            label: "Claude Opus 4",         badge: "claude-opus-4" },
      { id: "claude-sonnet-4",          label: "Claude Sonnet 4",       badge: "claude-sonnet-4" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet",   badge: "claude-3.5-sonnet" },
      { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku",    badge: "claude-3.5-haiku" },
    ],
  },
  openai: {
    label: "OpenAI", emoji: "🟢", color: "#22c55e",
    models: [
      { id: "gpt-4o",        label: "GPT-4o",          badge: "gpt-4o" },
      { id: "gpt-4o-mini",   label: "GPT-4o Mini",     badge: "gpt-4o-mini" },
      { id: "o3",            label: "o3",               badge: "o3" },
      { id: "o4-mini",       label: "o4-mini",          badge: "o4-mini" },
    ],
  },
  xai: {
    label: "xAI", emoji: "⚫", color: "#6b7280",
    models: [
      { id: "grok-3",        label: "Grok 3",           badge: "grok-3" },
      { id: "grok-3-mini",   label: "Grok 3 Mini",      badge: "grok-3-mini" },
    ],
  },
  google: {
    label: "Google", emoji: "🔵", color: "#3b82f6",
    models: [
      { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",     badge: "gemini-2.5-pro" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash",   badge: "gemini-2.0-flash" },
    ],
  },
  groq: {
    label: "Groq", emoji: "🟡", color: "#eab308",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",  badge: "llama-3.3-70b" },
      { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",   badge: "llama-3.1-8b" },
      { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B",   badge: "mixtral-8x7b" },
    ],
  },
  custom: {
    label: "Custom", emoji: "⚙️", color: "#6b7280",
    models: [
      { id: "custom", label: "Custom Model", badge: "custom" },
    ],
  },
};

export function getLLMLabel(provider?: string, model?: string): string {
  if (!provider) return "";
  const p = LLM_PROVIDERS[provider as LLMProvider];
  if (!p) return provider;
  if (!model) return `${p.emoji} ${p.label}`;
  const m = p.models.find(x => x.id === model);
  return `🧠 ${m?.label ?? model} (${p.label})`;
}

export interface AgentMetadata {
  name?: string;
  description?: string;
  version?: string;
  agentUrl?: string;
  llmProvider?: string;
  llmModel?: string;
  specialization?: string;
  tone?: string;
  skills?: string[];
  tools?: string[];
  capabilities?: string[];
  avatar?: { hash?: string; svg?: string };
  // legacy
  webhookUrl?: string;
  selfRegistered?: boolean;
}


const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

const metaCache = new Map<string, AgentMetadata>();

export async function parseMetadataURI(uri: string): Promise<AgentMetadata> {
  if (!uri) return {};
  const cached = metaCache.get(uri);
  if (cached) return cached;
  try {
    let json: AgentMetadata | null = null;
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1];
      if (b64) json = JSON.parse(atob(b64));
    } else if (uri.startsWith("ipfs://")) {
      const cid = uri.slice(7);
      for (const gw of IPFS_GATEWAYS) {
        try {
          const res = await fetch(gw + cid, { signal: AbortSignal.timeout(5000) });
          if (res.ok) { json = await res.json(); break; }
        } catch { /* try next */ }
      }
    } else if (uri.startsWith("https://") || uri.startsWith("http://")) {
      const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
      if (res.ok) json = await res.json();
    }
    const result: AgentMetadata = json ?? {};
    metaCache.set(uri, result);
    return result;
  } catch { return {}; }
}

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

export async function pinToIPFS(metadata: AgentMetadata): Promise<string | null> {
  try {
    const res = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as { value?: { cid?: string }; cid?: string };
      const cid = data?.value?.cid ?? data?.cid;
      if (cid) return `ipfs://${cid}`;
    }
  } catch { /* fallback */ }
  return null;
}

export function metadataToDataURI(metadata: AgentMetadata): string {
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}
