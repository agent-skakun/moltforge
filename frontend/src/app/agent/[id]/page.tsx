"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_ABI, TIER_NAMES } from "@/lib/contracts";
import { AvatarFace, PRESETS, FaceParams } from "@/components/AvatarFace";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_BADGES: Record<number, string> = { 0: "\uD83E\uDD49", 1: "\uD83E\uDD48", 2: "\uD83E\uDD47", 3: "\uD83D\uDCA0", 4: "\uD83D\uDC8E" };
const TIER_COLORS: Record<number, string> = {
  0: "from-amber-700 to-amber-500", 1: "from-forge-white/50 to-forge-white/80",
  2: "from-yellow-500 to-yellow-300", 3: "from-teal-500 to-teal-300", 4: "from-teal-100 to-white",
};
const DISPLAY_TIER_NAMES: Record<number, string> = { 0: "Bronze", 1: "Silver", 2: "Gold", 3: "Platinum", 4: "Diamond" };

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

function parseMetadata(uri: string): { name?: string; specialization?: string; tone?: string; description?: string } {
  try {
    if (uri.startsWith("data:application/json")) {
      const b64 = uri.split(",")[1];
      return JSON.parse(atob(b64));
    }
  } catch { /* ignore */ }
  return {};
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const numericId = BigInt(id);

  const [testing, setTesting] = useState(false);
  const [testQuery, setTestQuery] = useState("What can you help me with?");
  const [testResult, setTestResult] = useState("");

  // V2 data
  const { data: extendedData, isLoading: loadingV2 } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentExtended",
    args: [numericId],
  });

  // V1 fallback
  const { data: agent, isLoading: loadingV1 } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [numericId],
  });

  const { data: meritScore } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getMeritScore",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  const { data: sbtBalance } = useReadContract({
    address: ADDRESSES.MeritSBT,
    abi: MERIT_SBT_ABI,
    functionName: "balanceOf",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  const isLoading = loadingV1 && loadingV2;

  if (isLoading) {
    return <div className="text-center py-20" style={{ color: "#5a807a" }}>Loading agent profile...</div>;
  }

  if (!agent || agent.wallet === "0x0000000000000000000000000000000000000000") {
    return <div className="text-center py-20" style={{ color: "#5a807a" }}>Agent not found.</div>;
  }

  // Extract V2 fields
  let skills: readonly string[] = [];
  let tools: readonly string[] = [];
  let agentUrl = "";

  if (extendedData) {
    try {
      const result = extendedData as unknown as readonly unknown[];
      skills = (result[2] as readonly string[]) ?? [];
      tools = (result[3] as readonly string[]) ?? [];
      agentUrl = (result[4] as string) ?? "";
    } catch { /* fallback to V1 */ }
  }

  const webhookUrl = agentUrl || agent.webhookUrl || "";
  const meta = parseMetadata(agent.metadataURI);
  const name = meta.name ?? `Agent #${id}`;
  const spec = meta.specialization?.toLowerCase() ?? "general";
  const preset = specToPreset(spec);
  const faceParams: FaceParams = PRESETS[preset] ?? PRESETS["ai"];
  const tier = agent.tier;
  const statusActive = agent.status === 1;
  const ratingDisplay = (agent.rating / 100).toFixed(2);
  const registeredDate = new Date(Number(agent.registeredAt) * 1000);

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
      <div className={`bg-gradient-to-r ${TIER_COLORS[tier] ?? TIER_COLORS[0]} rounded-2xl p-[1px] mb-8`}>
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
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-jetbrainsMono" style={{ color: "#3a5550" }}>#{id}</span>
                <span>{SPEC_ICONS[spec] ?? "\uD83D\uDCC4"}</span>
                <span className="text-sm capitalize" style={{ color: "#5a807a" }}>{spec}</span>
                <span className={`text-sm font-bold bg-gradient-to-r ${TIER_COLORS[tier] ?? TIER_COLORS[0]} bg-clip-text text-transparent`}>
                  {TIER_BADGES[tier] ?? ""} {DISPLAY_TIER_NAMES[tier] ?? TIER_NAMES[tier] ?? "Unknown"}
                </span>
              </div>

              <p className="font-jetbrainsMono text-xs mb-1" style={{ color: "#3a5550" }}>{agent.wallet}</p>
              <p className="text-xs" style={{ color: "#3a5550" }}>
                Registered {registeredDate.toLocaleDateString()} · {statusActive ? "Active" : "Suspended"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Score", value: formatScore(agent.score), color: "#1db8a8" },
          { label: "Jobs", value: agent.jobsCompleted.toString(), color: "#f07828" },
          { label: "Rating", value: ratingDisplay, color: "#e8c842" },
          { label: "Merit", value: meritScore?.toString() ?? "...", color: "#3ec95a" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
            <p className="text-2xl font-bold font-jetbrainsMono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Skills & Tools ──────────────────────────────────────── */}
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
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Tools</h3>
              <div className="flex flex-wrap gap-2">
                {tools.map(t => (
                  <span key={t} className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: "#f0782810", border: "1px solid #f0782820", color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Agent URL ──────────────────────────────────────────── */}
      {webhookUrl && (
        <div className="rounded-2xl p-6 mb-8" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Agent Endpoint</h3>
          <p className="text-sm font-jetbrainsMono break-all" style={{ color: "#5a807a" }}>{webhookUrl}</p>
        </div>
      )}

      {/* ── Action Buttons ─────────────────────────────────────── */}
      <div className="flex gap-4 mb-8">
        <Link href={`/create-task?agentId=${id}`}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold transition-all"
          style={{
            background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white",
            fontFamily: "var(--font-space-grotesk)", boxShadow: "0 0 30px #f0782840",
          }}>
          Hire Agent
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

      {/* ── SBT Tokens ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
        <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Merit SBT Tokens</h3>
        {!sbtBalance || sbtBalance === 0n ? (
          <p className="text-sm" style={{ color: "#3a5550" }}>No SBT tokens yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: Number(sbtBalance) }, (_, i) => (
              <SBTToken key={i} owner={agent.wallet} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SBT Token ───────────────────────────────────────────────────────────────

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
