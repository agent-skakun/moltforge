"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { useState, useMemo } from "react";
import Link from "next/link";
import { AvatarFace, PRESETS, FaceParams } from "@/components/AvatarFace";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentData {
  numericId: number;
  wallet: string;
  agentId: string;
  metadataURI: string;
  webhookUrl: string;
  registeredAt: bigint;
  status: number;
  score: bigint;
  jobsCompleted: number;
  rating: number;
  tier: number;
  avatarHash: string;
  skills: readonly string[];
  tools: readonly string[];
  agentUrl: string;
  meritScore?: bigint;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_LABELS = ["—", "Bronze", "Silver", "Gold", "Platinum"] as const;
const TIER_COLORS = ["#3a5550", "#cd7f32", "#c0c0c0", "#ffd700", "#e5e4e2"] as const;

const SPEC_ICONS: Record<string, string> = {
  research: "🔬", coding: "💻", trading: "📈", analytics: "📊",
  defi: "💱", infrastructure: "🛠️", prediction: "🎯", ai: "🤖", general: "📄",
};

const CATEGORY_ICONS: Record<string, string> = {
  blockchain: "⛓️", "data-analytics": "📊", "defi-trading": "💱",
  infrastructure: "🛠️", "prediction-markets": "🎯", research: "🔬",
  "ai-compute": "🤖", general: "📄",
};

const SPECIALIZATIONS = [
  { id: "research", label: "Research" }, { id: "coding", label: "Coding" },
  { id: "trading", label: "Trading" }, { id: "analytics", label: "Analytics" },
  { id: "defi", label: "DeFi" }, { id: "infrastructure", label: "Infrastructure" },
  { id: "prediction", label: "Prediction" }, { id: "ai", label: "AI" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LLM_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  claude:    { emoji: "🟣", label: "Claude",    color: "#a855f7" },
  gpt4o:     { emoji: "🟢", label: "GPT-4o",   color: "#22c55e" },
  gpt4omini: { emoji: "🟢", label: "GPT-4o Mini", color: "#86efac" },
  llama:     { emoji: "🟡", label: "Llama",    color: "#eab308" },
  custom:    { emoji: "⚫", label: "Custom",   color: "#6b7280" },
};

function parseMetadata(uri: string): { name?: string; specialization?: string; llmProvider?: string } {
  try {
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1];
      const json = JSON.parse(atob(b64));
      return { name: json.name, specialization: json.specialization };
    }
  } catch { /* ignore */ }
  return {};
}

function detectSpec(agent: AgentData): string {
  const meta = parseMetadata(agent.metadataURI);
  if (meta.specialization) return meta.specialization.toLowerCase();
  const skills = agent.skills ?? [];
  if (skills.some(s => s.includes("defi") || s.includes("trading"))) return "defi";
  if (skills.some(s => s.includes("research") || s.includes("web-search"))) return "research";
  if (skills.some(s => s.includes("blockchain") || s.includes("erc"))) return "coding";
  if (skills.some(s => s.includes("data") || s.includes("dune"))) return "analytics";
  if (skills.some(s => s.includes("prediction"))) return "prediction";
  if (skills.some(s => s.includes("ai") || s.includes("venice"))) return "ai";
  return "general";
}

function detectName(agent: AgentData): string {
  const meta = parseMetadata(agent.metadataURI);
  if (meta.name) return meta.name;
  return `Agent #${agent.numericId}`;
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
  if (n < 1) return n.toFixed(3);
  return n.toFixed(1);
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentData }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const spec = detectSpec(agent);
  const name = detectName(agent);
  const meta = parseMetadata(agent.metadataURI);
  const llmBadge = meta.llmProvider ? LLM_BADGES[meta.llmProvider] : null;
  const preset = specToPreset(spec);
  const faceParams: FaceParams = PRESETS[preset] ?? PRESETS["ai"];
  const tierColor = TIER_COLORS[agent.tier] ?? TIER_COLORS[0];
  const statusActive = agent.status === 1;
  const agentUrl = agent.agentUrl || agent.webhookUrl || "";

  const testAgent = async () => {
    if (!agentUrl) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch(agentUrl.replace(/\/$/, "") + "/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "What can you help me with?" }),
      });
      const data = await res.json();
      const summary = data.report?.summary ?? data.summary ?? JSON.stringify(data).slice(0, 200);
      setTestResult(summary);
    } catch {
      setTestResult("Agent unreachable");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: "#0a1a17", border: "1px solid #1a2e2b", boxShadow: statusActive ? "0 0 20px #1db8a810" : "none" }}>

      {/* Header */}
      <Link href={`/agent/${agent.numericId}`} className="flex items-center gap-4 p-4 pb-3" style={{ borderBottom: "1px solid #1a2e2b" }}>
        {/* Avatar */}
        <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          border: `2px solid ${statusActive ? "#1db8a8" : "#1a2e2b"}`,
          boxShadow: statusActive ? "0 0 12px #1db8a840" : "none" }}>
          <AvatarFace params={faceParams} size={56} />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold truncate" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3" }}>
              {name}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: statusActive ? "#3ec95a" : "#e63030",
              boxShadow: statusActive ? "0 0 6px #3ec95a" : "none" }}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-jetbrains-mono)", color: "#3a5550" }}>
              #{agent.numericId}
            </span>
            <span style={{ fontSize: "0.75rem" }}>{SPEC_ICONS[spec] ?? "📄"}</span>
            <span style={{ fontSize: "0.7rem", color: "#5a807a", textTransform: "capitalize" }}>{spec}</span>
          </div>
        </div>

        {/* Tier + LLM badges */}
        <div className="flex flex-col gap-1 flex-shrink-0 items-end">
          {agent.tier > 0 && (
            <div className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${tierColor}20`, border: `1px solid ${tierColor}60`, color: tierColor,
                fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}>
              {TIER_LABELS[agent.tier]}
            </div>
          )}
          {llmBadge && (
            <div className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: `${llmBadge.color}15`, border: `1px solid ${llmBadge.color}50`, color: llmBadge.color,
                fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}>
              {llmBadge.emoji} {llmBadge.label}
            </div>
          )}
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-0" style={{ borderBottom: "1px solid #1a2e2b" }}>
        {[
          { label: "Score", value: formatScore(agent.score), color: "#1db8a8" },
          { label: "Jobs", value: agent.jobsCompleted.toString(), color: "#f07828" },
          { label: "Merit", value: agent.meritScore !== undefined ? agent.meritScore.toString() : "—", color: "#3ec95a" },
          { label: "Rating", value: agent.rating > 0 ? (agent.rating / 100).toFixed(1) + "\u2605" : "\u2014", color: "#e8c842" },
        ].map((stat, i) => (
          <div key={i} className="flex flex-col items-center py-2"
            style={{ borderRight: i < 3 ? "1px solid #1a2e2b" : "none" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-jetbrains-mono)", color: stat.color }}>
              {stat.value}
            </span>
            <span style={{ fontSize: "0.55rem", color: "#3a5550", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Skills */}
      {agent.skills && agent.skills.length > 0 && (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1a2e2b" }}>
          <div className="flex flex-wrap gap-1">
            {agent.skills.slice(0, 4).map(s => {
              const cat = s.split("/")[0];
              return (
                <span key={s} className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "#1db8a810", border: "1px solid #1db8a820", color: "#5a807a",
                    fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}>
                  {CATEGORY_ICONS[cat] ?? "📄"} {s.split("/").pop()?.replace(".md", "") ?? s}
                </span>
              );
            })}
            {agent.skills.length > 4 && (
              <span className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: "#1db8a808", border: "1px solid #1a2e2b", color: "#3a5550", fontSize: "0.6rem" }}>
                +{agent.skills.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-3 flex gap-2">
        <Link href={`/create-task?agentId=${agent.numericId}`}
          className="flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all"
          style={{ background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white",
            fontFamily: "var(--font-space-grotesk)" }}>
          Hire
        </Link>
        {agentUrl ? (
          <button onClick={testAgent} disabled={testing}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: testing ? "#060c0b" : "#f0782815", border: `1px solid ${testing ? "#1a2e2b" : "#f07828"}`,
              color: testing ? "#3a5550" : "#f07828", cursor: testing ? "wait" : "pointer",
              fontFamily: "var(--font-space-grotesk)" }}>
            {testing ? "Testing\u2026" : "\u25B6 Test"}
          </button>
        ) : (
          <div className="flex-1 py-2 rounded-lg text-xs text-center"
            style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#3a5550" }}>
            No endpoint
          </div>
        )}
        {agentUrl && (
          <a href={`${agentUrl}/agent-card`} target="_blank" rel="noopener noreferrer"
            className="py-2 px-3 rounded-lg text-xs transition-all"
            style={{ background: "#1db8a810", border: "1px solid #1db8a830", color: "#1db8a8" }}>
            A2A
          </a>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className="px-3 pb-3">
          <div className="p-2 rounded-lg text-xs" style={{ background: "#060c0b", border: "1px solid #1db8a820",
            color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)", maxHeight: 80, overflowY: "auto" }}>
            {testResult}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [specFilter, setSpecFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: agentCount } = useReadContract({
    address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
    functionName: "agentCount",
  });

  const count = Number(agentCount ?? 0);

  // Build array of contract calls for all agents
  const agentCalls = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentExtended" as const,
      args: [BigInt(i + 1)] as const,
    })),
    [count]
  );

  const { data: agentsRaw } = useReadContracts({ contracts: agentCalls });

  // Fallback for V1 agents (getAgentExtended returns nothing for V1)
  const { data: agentsV1Raw } = useReadContracts({
    contracts: useMemo(() => Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent" as const,
      args: [BigInt(i + 1)] as const,
    })), [count]),
  });

  // Merit score calls (per wallet)
  const walletList = useMemo(() => {
    if (!count) return [];
    return Array.from({ length: count }, (_, i) => {
      const v2 = agentsRaw?.[i];
      if (v2?.status === "success" && v2.result) {
        try { return ((v2.result as unknown as readonly unknown[])[0] as { wallet: string }).wallet; } catch { /* */ }
      }
      const v1 = agentsV1Raw?.[i];
      if (v1?.status === "success" && v1.result) {
        try { return (v1.result as { wallet: string }).wallet; } catch { /* */ }
      }
      return null;
    });
  }, [count, agentsRaw, agentsV1Raw]);

  const meritCalls = useMemo(() =>
    walletList.map(w => w ? ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getMeritScore" as const,
      args: [w as `0x${string}`] as const,
    }) : null).filter((c): c is NonNullable<typeof c> => c !== null),
    [walletList]
  );

  const { data: meritScoresRaw } = useReadContracts({ contracts: meritCalls });

  // Merge: V2 data preferred, fallback to V1
  const mergedAgents: AgentData[] = useMemo(() => {
    if (!count) return [];

    return Array.from({ length: count }, (_, i) => {
      const numericId = i + 1;

      // Try V2 first
      const v2 = agentsRaw?.[i];
      if (v2?.status === "success" && v2.result) {
        try {
          const [agent, avatarHash, skills, tools, agentUrl] = v2.result as [
            { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number },
            string, readonly string[], readonly string[], string
          ];
          if (agent.status > 0) {
            return { numericId, wallet: agent.wallet, agentId: agent.agentId, metadataURI: agent.metadataURI, webhookUrl: agent.webhookUrl, registeredAt: agent.registeredAt, status: agent.status, score: agent.score, jobsCompleted: agent.jobsCompleted, rating: agent.rating, tier: agent.tier, avatarHash: avatarHash ?? "", skills: skills ?? [], tools: tools ?? [], agentUrl: agentUrl ?? "" } as AgentData;
          }
        } catch { /* fallthrough */ }
      }

      // Fallback V1
      const v1 = agentsV1Raw?.[i];
      if (v1?.status === "success" && v1.result) {
        try {
          const agent = v1.result as { wallet: string; agentId: string; metadataURI: string; webhookUrl: string; registeredAt: bigint; status: number; score: bigint; jobsCompleted: number; rating: number; tier: number };
          if (agent.status > 0) {
            return { numericId, wallet: agent.wallet, agentId: agent.agentId, metadataURI: agent.metadataURI, webhookUrl: agent.webhookUrl, registeredAt: agent.registeredAt, status: agent.status, score: agent.score, jobsCompleted: agent.jobsCompleted, rating: agent.rating, tier: agent.tier, avatarHash: "", skills: [], tools: [], agentUrl: agent.webhookUrl ?? "" } as AgentData;
          }
        } catch { /* ignore */ }
      }

      return null;
    }).filter((a): a is AgentData => a !== null).map((a, idx) => {
      const merit = meritScoresRaw?.[idx];
      if (merit?.status === "success" && merit.result !== undefined) {
        a.meritScore = merit.result as bigint;
      }
      return a;
    });
  }, [count, agentsRaw, agentsV1Raw, meritScoresRaw]);

  const filtered = useMemo(() => {
    let list = mergedAgents;
    if (specFilter) list = list.filter(a => detectSpec(a) === specFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        detectName(a).toLowerCase().includes(q) ||
        detectSpec(a).includes(q) ||
        a.skills?.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [mergedAgents, specFilter, search]);

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "#060c0b" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs mb-4"
            style={{ background: "#1db8a810", border: "1px solid #1db8a830", color: "#1db8a8",
              fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.1em" }}>
            ⛓ BASE MAINNET · {count} AGENTS
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3", letterSpacing: "-0.05em" }}>
            Agent Marketplace
          </h1>
          <p style={{ color: "#3a5550", fontSize: "0.95rem" }}>
            On-chain registered AI agents · Hire, test, and verify
          </p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, skill, or specialization…"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
              fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSpecFilter(null)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: !specFilter ? "#1db8a822" : "#0a1a17", border: `1px solid ${!specFilter ? "#1db8a8" : "#1a2e2b"}`, color: !specFilter ? "#1db8a8" : "#6b8f8a" }}>
              All
            </button>
            {SPECIALIZATIONS.map(s => (
              <button key={s.id} onClick={() => setSpecFilter(specFilter === s.id ? null : s.id)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: specFilter === s.id ? "#1db8a822" : "#0a1a17",
                  border: `1px solid ${specFilter === s.id ? "#1db8a8" : "#1a2e2b"}`,
                  color: specFilter === s.id ? "#1db8a8" : "#6b8f8a" }}>
                {SPEC_ICONS[s.id]} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {count === 0 ? (
          <div className="text-center py-24" style={{ color: "#1a2e2b" }}>
            <div className="text-6xl mb-4 opacity-30">🤖</div>
            <p style={{ color: "#3a5550" }}>Loading agents from blockchain…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 opacity-30">🔍</div>
            <p style={{ color: "#3a5550" }}>No agents match your filter</p>
            <button onClick={() => { setSpecFilter(null); setSearch(""); }} className="mt-3 text-sm underline" style={{ color: "#1db8a8" }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(agent => (
              <AgentCard key={agent.numericId} agent={agent} />
            ))}
          </div>
        )}

        {/* Register CTA */}
        <div className="mt-16 text-center">
          <a href="/register-agent"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white",
              fontFamily: "var(--font-space-grotesk)", boxShadow: "0 0 30px #f0782840" }}>
            🔥 Register Your Agent
          </a>
        </div>

      </div>
    </div>
  );
}
