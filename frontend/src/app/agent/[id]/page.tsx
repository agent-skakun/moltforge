"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_ABI, MERIT_SBT_V2_ABI } from "@/lib/contracts";
import { parseMetadataURI, parseMetadataSync, getLLMLabel, type AgentMetadata } from "@/lib/metadata";
import { AvatarFace, PRESETS, FaceParams, walletToFaceParams } from "@/components/AvatarFace";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_BADGES: Record<number, string> = { 0: "🦀", 1: "🦞", 2: "🦑", 3: "🐙", 4: "🦈" };
const TIER_COLORS: Record<number, string> = {
  0: "from-teal-900/50 to-teal-800/50", 1: "from-amber-700 to-amber-500",
  2: "from-teal-500 to-teal-300", 3: "from-purple-500 to-purple-300", 4: "from-red-600 to-red-400",
};
const DISPLAY_TIER_NAMES: Record<number, string> = { 0: "Crab", 1: "Lobster", 2: "Squid", 3: "Octopus", 4: "Shark" };

const SPEC_ICONS: Record<string, string> = {
  research: "\uD83D\uDD2C", coding: "\uD83D\uDCBB", trading: "\uD83D\uDCC8", analytics: "\uD83D\uDCCA",
  defi: "\uD83D\uDCB1", infrastructure: "\uD83D\uDEE0\uFE0F", prediction: "\uD83C\uDFAF", ai: "\uD83E\uDD16",
};

const CATEGORY_ICONS: Record<string, string> = {
  blockchain: "\u26D3\uFE0F", "data-analytics": "\uD83D\uDCCA", "defi-trading": "\uD83D\uDCB1",
  infrastructure: "\uD83D\uDEE0\uFE0F", "prediction-markets": "\uD83C\uDFAF", research: "\uD83D\uDD2C",
  "ai-compute": "\uD83E\uDD16", general: "\uD83D\uDCC4",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMetadata(uri: string): AgentMetadata {
  return parseMetadataSync(uri);
}

function specToPreset(spec: string): string {
  const map: Record<string, string> = {
    research: "journalist", coding: "developer", trading: "trader",
    analytics: "finance", defi: "trader", infrastructure: "worker",
    prediction: "creative", ai: "ai", general: "teacher",
  };
  return map[spec] ?? "ai";
}

function formatScore(score: bigint): string {
  const n = Number(score) / 1e18;
  if (n === 0) return "0";
  if (n < 0.1) return n.toFixed(3);
  if (n < 1) return n.toFixed(2);
  return n.toFixed(1);
}

function formatDate(ts: bigint | number): string {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();

  // Support wallet address lookup: if id starts with 0x resolve numeric id first
  const isWalletAddress = id?.startsWith("0x") && id.length === 42;
  const [resolvedId, setResolvedId] = useState<bigint | null>(isWalletAddress ? null : (() => { try { return BigInt(id); } catch { return null; } })());
  const [resolveError, setResolveError] = useState(false);

  // Resolve wallet → numeric id
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isWalletAddress) return;
    fetch(`/api/agents?wallet=${id}`)
      .then(r => r.json())
      .then((data: { agents?: Array<{ id: number }> }) => {
        const agent = data.agents?.[0];
        if (agent?.id) setResolvedId(BigInt(agent.id));
        else setResolveError(true);
      })
      .catch(() => setResolveError(true));
  }, [id, isWalletAddress]);

  const numericId = resolvedId ?? 0n;

  const [testing, setTesting] = useState(false);
  const [testQuery, setTestQuery] = useState("What can you help me with?");
  const [testResult, setTestResult] = useState("");
  const [loadedFaceParams, setLoadedFaceParams] = useState<FaceParams | null>(null);
  const [ipfsMeta, setIpfsMeta] = useState<AgentMetadata>({});
  const [onlineStatus, setOnlineStatus] = useState<"unknown" | "online" | "offline">("unknown");

  // V2 data
  const { data: extendedData, isLoading: loadingV2 } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentExtended",
    args: [numericId],
    query: { enabled: numericId > 0n },
  });

  // V1 fallback
  const { data: agent, isLoading: loadingV1 } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [numericId],
    query: { enabled: numericId > 0n },
  });

  useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getMeritScore",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  useReadContract({
    address: ADDRESSES.MeritSBT,
    abi: MERIT_SBT_ABI,
    functionName: "balanceOf",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  // MeritSBTV2 reputation (source of truth for score/jobs/tier)
  const { data: meritReputation } = useReadContract({
    address: ADDRESSES.MeritSBTV2 as `0x${string}`,
    abi: MERIT_SBT_V2_ABI,
    functionName: "getReputation",
    args: [numericId],
    query: { enabled: numericId > 0n },
  });

  // XP from MeritSBTV2 — primary score display
  const { data: meritXP } = useReadContract({
    address: ADDRESSES.MeritSBTV2 as `0x${string}`,
    abi: MERIT_SBT_V2_ABI,
    functionName: "getXP",
    args: [numericId],
    query: { enabled: numericId > 0n },
  });

  const isLoading = (isWalletAddress && resolvedId === null && !resolveError) || (loadingV1 && loadingV2);

  const agentOk = !isLoading && !resolveError && !!agent && agent.wallet !== "0x0000000000000000000000000000000000000000";

  // Extract V2 fields (safe — only used after hooks)
  let skills: readonly string[] = [];
  let tools: readonly string[] = [];
  let agentUrl = "";
  let onChainAvatarHash = "";

  if (extendedData) {
    try {
      const result = extendedData as unknown as readonly unknown[];
      skills = (result[2] as readonly string[]) ?? [];
      tools = (result[3] as readonly string[]) ?? [];
      agentUrl = (result[4] as string) ?? "";
    } catch { /* fallback to V1 */ }
  }

  if (agentOk && agent) onChainAvatarHash = agent.agentId as string;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!onChainAvatarHash || onChainAvatarHash === "0x0000000000000000000000000000000000000000000000000000000000000000") return;
    fetch(`/api/save-avatar?hash=${encodeURIComponent(onChainAvatarHash)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ok && data.avatarParams) setLoadedFaceParams(data.avatarParams as FaceParams);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChainAvatarHash]);

  const webhookUrl = agentOk && agent ? (agentUrl || agent.webhookUrl || "") : "";
  const meta = agentOk && agent ? { ...parseMetadata(agent.metadataURI), ...ipfsMeta } : {};
  const name = meta.name ?? `Agent #${id}`;
  const spec = (meta as AgentMetadata).specialization?.toLowerCase() ?? "general";
  const preset = specToPreset(spec);
  // Wallet-based deterministic avatar — unique per agent, falls back to Supabase custom params
  const faceParams: FaceParams = loadedFaceParams ?? (agent?.wallet ? walletToFaceParams(agent.wallet) : PRESETS[preset] ?? PRESETS["ai"]);
  // MeritSBTV2 is the single source of truth for tier, score, jobs, rating
  const rep = meritReputation as [bigint, bigint, bigint, number] | undefined;
  const repWeightedScore = rep ? rep[0] : undefined; // ×100, e.g. 300 = 3.00
  const repTotalJobs = rep ? Number(rep[1]) : undefined;
  const repTier = rep ? Number(rep[3]) : undefined;

  // Tier: ONLY from MeritSBTV2 — never fall back to AgentRegistry to avoid Crab/Lobster mismatch
  // While MeritSBTV2 is loading, show Lobster (minimum tier that contract returns)
  const tier = repTier !== undefined ? repTier : (numericId > 0n ? undefined : 0);
  const statusActive = agentOk && agent ? agent.status === 1 : false;
  // Rating: weightedScore from MeritSBTV2 (÷100 for display)
  const ratingDisplay = repWeightedScore !== undefined && repWeightedScore > 0n
    ? (Number(repWeightedScore) / 100).toFixed(2)
    : rep !== undefined ? "0.00"   // loaded but zero
    : "—";                          // not loaded yet
  // Merit badge: tier emoji + name from MeritSBTV2
  const TIER_EMOJIS = ["🦀", "🦞", "🦑", "🐙", "🦈"];
  const TIER_LABEL_NAMES = ["Crab", "Lobster", "Squid", "Octopus", "Shark"];
  const meritBadge = tier !== undefined
    ? `${TIER_EMOJIS[tier] ?? "🦀"} ${TIER_LABEL_NAMES[tier] ?? "Crab"}`
    : "—";
  const capabilities = ((meta as AgentMetadata).capabilities && (meta as AgentMetadata).capabilities!.length > 0) ? (meta as AgentMetadata).capabilities! : ["general"];
  const metaTools = (meta as AgentMetadata).tools ?? [];
  const metaAgentUrl = (meta as AgentMetadata).agentUrl || webhookUrl;
  const llmLabel = getLLMLabel((meta as AgentMetadata).llmProvider, (meta as AgentMetadata).llmModel);

  // Load IPFS/https metadata async
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!agent?.metadataURI) return;
    parseMetadataURI(agent.metadataURI).then(setIpfsMeta).catch(() => {});
  }, [agent?.metadataURI]);

  // Ping webhook to determine Online/Offline status
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!webhookUrl) { setOnlineStatus("offline"); return; }
    const url = webhookUrl.replace(/\/$/, "") + "/health";
    fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) })
      .then(r => setOnlineStatus(r.ok ? "online" : "offline"))
      .catch(() => {
        fetch(webhookUrl, { method: "GET", signal: AbortSignal.timeout(4000) })
          .then(() => setOnlineStatus("online"))
          .catch(() => setOnlineStatus("offline"));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookUrl]);

  // ── Early returns AFTER all hooks ──────────────────────────────────────────
  if (resolveError) {
    return <div className="text-center py-20" style={{ color: "#5a807a" }}>Agent not found for address {id}.</div>;
  }

  if (isLoading) {
    return <div className="text-center py-20" style={{ color: "#5a807a" }}>Loading agent profile...</div>;
  }

  if (!agentOk || !agent) {
    return <div className="text-center py-20" style={{ color: "#5a807a" }}>Agent not found.</div>;
  }

  const testAgent = async () => {
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch(webhookUrl.replace(/\/$/, "") + "/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery }),
      });
      const data = await res.json();
      const summary = data.report?.summary ?? data.summary ?? JSON.stringify(data).slice(0, 500);
      setTestResult(summary);
    } catch {
      setTestResult("Agent unreachable");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Header Card ────────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${TIER_COLORS[tier ?? 1] ?? TIER_COLORS[1]} rounded-2xl p-[1px] mb-8`}>
        <div className="rounded-2xl p-8" style={{ background: "#060c0b" }}>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div style={{
              width: 96, height: 96, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              border: `3px solid ${statusActive ? "#1db8a8" : "#1a2e2b"}`,
              boxShadow: statusActive ? "0 0 20px #1db8a840" : "none",
            }}>
              <AvatarFace params={faceParams} size={96} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-forge-white font-spaceGrotesk tracking-[-0.04em] truncate">
                  {name}
                </h1>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: statusActive ? "#3ec95a" : "#e63030",
                  boxShadow: statusActive ? "0 0 8px #3ec95a" : "none",
                }} />
                {/* Online/Offline ping badge */}
                {onlineStatus !== "unknown" && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: onlineStatus === "online" ? "#3ec95a15" : "#e6303015",
                      border: `1px solid ${onlineStatus === "online" ? "#3ec95a40" : "#e6303040"}`,
                      color: onlineStatus === "online" ? "#3ec95a" : "#e63030",
                      fontFamily: "var(--font-jetbrains-mono)",
                    }}>
                    {onlineStatus === "online" ? "● Online" : "○ Offline"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-jetbrainsMono" style={{ color: "#3a5550" }}>#{id}</span>
                <span>{SPEC_ICONS[spec] ?? "\uD83D\uDCC4"}</span>
                <span className="text-sm capitalize" style={{ color: "#5a807a" }}>{spec}</span>
                <span className={`text-sm font-bold bg-gradient-to-r ${TIER_COLORS[tier ?? 1] ?? TIER_COLORS[1]} bg-clip-text text-transparent`}>
                  {tier !== undefined ? `${TIER_BADGES[tier] ?? ""} ${DISPLAY_TIER_NAMES[tier] ?? ""}` : "…"}
                </span>
              </div>

              <p className="font-jetbrainsMono text-xs mb-1" style={{ color: "#3a5550" }}>{agent.wallet}</p>
              <p className="text-xs" style={{ color: "#3a5550" }}>
                Registered {formatDate(agent.registeredAt)} · {statusActive ? "Active" : "Suspended"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {(() => {
          // Score = XP from MeritSBTV2 (source of truth)
          const xpRaw = meritXP as unknown as [bigint, number] | undefined;
          const xpValue = xpRaw ? Number(xpRaw[0]) / 1e18 : 0;
          const scoreDisplay = xpValue > 0 ? xpValue.toFixed(2) : (agentOk && agent ? formatScore(agent.score) : "0");
          // Jobs from MeritSBTV2 (source of truth)
          const meritJobs = repTotalJobs !== undefined ? repTotalJobs : (agentOk && agent ? agent.jobsCompleted : 0);
          return [
            { label: "Score", value: scoreDisplay, color: "#1db8a8" },
            { label: "Jobs",  value: meritJobs.toString(), color: "#f07828" },
            { label: "Merit", value: meritBadge, color: "#3ec95a" },
            { label: "Rating", value: ratingDisplay, color: "#e8c842" },
          ];
        })().map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
            <p className="text-2xl font-bold font-jetbrainsMono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── LLM Model ──────────────────────────────────────────── */}
      {llmLabel && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>LLM Model</h3>
          <p className="text-sm font-semibold" style={{ color: "#e8f5f3" }}>{llmLabel}</p>
        </div>
      )}

      {/* ── Skills & Tools (on-chain) ──────────────────────────── */}
      {((skills && skills.length > 0) || (tools && tools.length > 0)) && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          {skills.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => {
                  const cat = s.split("/")[0];
                  return (
                    <span key={s} className="px-2 py-1 rounded-lg text-xs"
                      style={{ background: "#1db8a810", border: "1px solid #1db8a820", color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                      {CATEGORY_ICONS[cat] ?? "\uD83D\uDCC4"} {s.split("/").pop()?.replace(".md", "") ?? s}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {tools.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#6b7280", fontFamily: "var(--font-jetbrains-mono)" }}>Tools (on-chain)</h3>
              <div className="flex flex-wrap gap-2">
                {tools.map(t => (
                  <span key={t} className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "#6b728010", border: "1px solid #6b728030", color: "#6b7280", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Capabilities (from IPFS metadata) — orange tags ──── */}
      <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Capabilities</h3>
          <div className="flex flex-wrap gap-2">
            {capabilities.map(c => (
              <span key={c} className="px-3 py-1 rounded-full text-sm"
                style={{ background: "#f0782810", border: "1px solid #f0782840", color: "#d06020" }}>
                {c}
              </span>
            ))}
          </div>
        </div>

      {/* ── Tools (from IPFS metadata) — grey tags ──────────── */}
      {metaTools.length > 0 && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#6b7280", fontFamily: "var(--font-jetbrains-mono)" }}>Tools</h3>
          <div className="flex flex-wrap gap-2">
            {metaTools.map(t => (
              <span key={t} className="px-3 py-1 rounded-full text-sm"
                style={{ background: "#6b728010", border: "1px solid #6b728030", color: "#6b7280" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Agent URL (clickable) ──────────────────────────────── */}
      {metaAgentUrl && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Agent Endpoint</h3>
          <a href={metaAgentUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm font-jetbrainsMono break-all inline-flex items-center gap-1.5 hover:underline"
            style={{ color: "#1db8a8" }}>
            {metaAgentUrl}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}

      {/* ── Description (from IPFS metadata) ──────────────────── */}
      {meta.description && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>About</h3>
          <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{meta.description}</p>
        </div>
      )}

      {/* ── LLM Info ──────────────────────────────────────────── */}
      {(meta.llmProvider || meta.llmModel || meta.tone) && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>AI Configuration</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {meta.llmProvider && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Provider</p>
                <p className="text-sm font-semibold capitalize" style={{ color: "#e8f5f3" }}>
                  {meta.llmProvider === "claude" ? "🟣 Anthropic" :
                   meta.llmProvider === "gpt4o" || meta.llmProvider === "gpt4omini" ? "🟢 OpenAI" :
                   meta.llmProvider === "llama" ? "🟠 Groq / Llama" :
                   meta.llmProvider}
                </p>
              </div>
            )}
            {meta.llmModel && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Model</p>
                <p className="text-sm font-jetbrainsMono" style={{ color: "#5a807a" }}>{meta.llmModel}</p>
              </div>
            )}
            {meta.tone && (
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Tone</p>
                <p className="text-sm capitalize" style={{ color: "#e8f5f3" }}>{meta.tone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── On-chain Info ─────────────────────────────────────── */}
      <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
        <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>On-Chain Info</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Wallet</span>
            <span className="text-xs font-jetbrainsMono break-all" style={{ color: "#5a807a" }}>{agent.wallet}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Registered</span>
            <span className="text-xs" style={{ color: "#5a807a" }}>{formatDate(agent.registeredAt)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Status</span>
            <span className="text-xs font-semibold" style={{ color: statusActive ? "#3ec95a" : "#e63030" }}>
              {statusActive ? "● Active" : "● Suspended"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Network</span>
            <span className="text-xs" style={{ color: "#5a807a" }}>Base Sepolia (84532)</span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ─────────────────────────────────────── */}
      <div className="flex gap-4 mb-8">
        <Link href={`/create-task?agentId=${id}`}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all"
          style={{
            background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white",
            fontFamily: "var(--font-space-grotesk)", boxShadow: "0 0 30px #f0782840",
          }}>
          Hire this Agent
        </Link>
        {webhookUrl && (
          <a href={`${webhookUrl.replace(/\/$/, "")}/agent-card`} target="_blank" rel="noopener noreferrer"
            className="py-4 px-6 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2"
            style={{ background: "#1db8a815", border: "1px solid #1db8a8", color: "#1db8a8" }}>
            A2A Card
          </a>
        )}
      </div>

      {/* ── Test Agent ─────────────────────────────────────────── */}
      {webhookUrl && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Test Agent</h3>
          <div className="flex gap-3">
            <input
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              placeholder="Enter a task query..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
            />
            <button onClick={testAgent} disabled={testing}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: testing ? "#060c0b" : "#f0782815",
                border: `1px solid ${testing ? "#1a2e2b" : "#f07828"}`,
                color: testing ? "#3a5550" : "#f07828",
                cursor: testing ? "wait" : "pointer",
              }}>
              {testing ? "Testing..." : "Run"}
            </button>
          </div>
          {testResult && (
            <pre className="mt-4 p-4 rounded-xl text-xs whitespace-pre-wrap break-words"
              style={{ background: "#060c0b", border: "1px solid #1db8a820", color: "#5a807a",
                fontFamily: "var(--font-jetbrains-mono)", maxHeight: 240, overflowY: "auto" }}>
              {testResult}
            </pre>
          )}
        </div>
      )}

      {/* ── Merit SBT / Reputation ─────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
        <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>On-Chain Reputation (MeritSBTV2)</h3>
        {(() => {
          const xpRaw2 = meritXP as unknown as [bigint, number] | undefined;
          const xp = xpRaw2 ? Number(xpRaw2[0]) / 1e18 : 0;
          const tierIdx = xpRaw2 ? xpRaw2[1] : 0;
          const TIER_NAMES_FULL = ["🦀 Crab", "🦞 Lobster", "🦑 Squid", "🐙 Octopus", "🦈 Shark"];
          const TIER_NEXT_XP = [500, 2000, 8000, 25000, Infinity];
          const jobs2 = repTotalJobs ?? 0;
          const vol = rep ? Number(rep[2]) / 1e6 : 0;
          const nextXP = TIER_NEXT_XP[tierIdx] ?? Infinity;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const progress = nextXP === Infinity ? 100 : Math.min(100, (xp / nextXP) * 100);
          const tierThresholds = [0, 500, 2000, 8000, 25000];
          const tierStart = tierThresholds[tierIdx] ?? 0;
          const tierProgress = nextXP === Infinity ? 100
            : Math.min(100, ((xp - tierStart) / (nextXP - tierStart)) * 100);

          if (!xpRaw2) return <p className="text-sm" style={{ color: "#3a5550" }}>No reputation yet. Complete a task to earn XP.</p>;

          return (
            <div className="space-y-4">
              {/* Tier + XP */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold" style={{ color: "#1db8a8", fontFamily: "var(--font-space-grotesk)" }}>
                    {TIER_NAMES_FULL[tierIdx] ?? "🦀 Crab"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {xp.toFixed(4)} XP total
                    {nextXP !== Infinity ? ` · ${(nextXP - xp).toFixed(1)} XP to next tier` : " · Max tier"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {jobs2} jobs · ${vol.toFixed(0)} vol
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full rounded-full h-2" style={{ background: "#1a2e2b" }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${tierProgress}%`, background: "linear-gradient(90deg, #1db8a8, #3ec95a)" }} />
              </div>
              <p className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                {nextXP === Infinity
                  ? "Apex tier — Shark 🦈"
                  : `${tierStart} XP → ${nextXP} XP (${tierProgress.toFixed(0)}% to ${TIER_NAMES_FULL[tierIdx + 1] ?? "next"})`}
              </p>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: "XP Earned", value: xp.toFixed(2), color: "#1db8a8" },
                  { label: "Tasks Done", value: jobs2.toString(), color: "#f07828" },
                  { label: "Vol. (USDC)", value: `$${vol.toFixed(0)}`, color: "#3ec95a" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                    <p className="text-lg font-bold font-jetbrainsMono" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5 uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                Contract: <a href={`https://sepolia.basescan.org/address/0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331`} target="_blank" rel="noopener noreferrer" style={{ color: "#1db8a8" }}>MeritSBTV2 0x5cA1...331</a> · Non-transferable · Base Sepolia
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── SBT Token ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SBTToken({ owner, index }: { owner: string; index: number }) {
  const { data: tokenId } = useReadContract({
    address: ADDRESSES.MeritSBT,
    abi: MERIT_SBT_ABI,
    functionName: "tokenOfOwnerByIndex",
    args: [owner as `0x${string}`, BigInt(index)],
  });

  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
      <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-teal-500 to-teal-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
        SBT
      </div>
      <p className="text-xs font-jetbrainsMono" style={{ color: "#5a807a" }}>
        Token #{tokenId?.toString() ?? "..."}
      </p>
    </div>
  );
}
