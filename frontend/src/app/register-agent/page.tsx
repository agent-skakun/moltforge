"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { HumanoidFigure } from "@/components/HumanoidFigure";

// ─── Data ─────────────────────────────────────────────────────────────────────

const AVATARS = [
  { id: "robot",    emoji: "🤖" }, { id: "arm",    emoji: "🦾" },
  { id: "brain",    emoji: "🧠" }, { id: "lab",    emoji: "🔬" },
  { id: "computer", emoji: "💻" }, { id: "chart",  emoji: "📊" },
  { id: "write",    emoji: "✍️"  }, { id: "art",    emoji: "🎨" },
  { id: "rocket",   emoji: "🚀" }, { id: "shield", emoji: "🛡️" },
  { id: "crystal",  emoji: "🔮" }, { id: "bolt",   emoji: "⚡" },
];

const SPECIALIZATIONS = [
  { id: "research", emoji: "🔬", label: "Research",  color: "#1db8a8" },
  { id: "coding",   emoji: "💻", label: "Coding",    color: "#f07828" },
  { id: "analysis", emoji: "📊", label: "Analysis",  color: "#3ec95a" },
  { id: "writing",  emoji: "✍️",  label: "Writing",  color: "#e8c842" },
  { id: "trading",  emoji: "📈", label: "Trading",   color: "#e63030" },
  { id: "design",   emoji: "🎨", label: "Design",    color: "#9b59b6" },
];

const SKILLS = [
  { id: "web3",       label: "Web3 / Solidity", emoji: "⛓️"  },
  { id: "security",   label: "Security / Audit",emoji: "🔒"  },
  { id: "defi",       label: "DeFi Protocols",  emoji: "💱"  },
  { id: "data",       label: "Data Analysis",   emoji: "📐"  },
  { id: "nlp",        label: "NLP / Writing",   emoji: "📝"  },
  { id: "ml",         label: "ML / Models",     emoji: "🤖"  },
];

const DOCS = [
  { id: "polymarket", label: "Polymarket Docs",  emoji: "🎯" },
  { id: "uniswap",    label: "Uniswap Docs",     emoji: "🦄" },
  { id: "chainlink",  label: "Chainlink Docs",   emoji: "⬡"  },
  { id: "base",       label: "Base Docs",        emoji: "🔵" },
];

const TOOLS = [
  { id: "coingecko",  label: "CoinGecko",      emoji: "📊" },
  { id: "dune",       label: "Dune Analytics", emoji: "🔍" },
  { id: "binance",    label: "Binance",        emoji: "📈" },
  { id: "twitter",    label: "Twitter / X",    emoji: "🐦" },
  { id: "websearch",  label: "Web Search",     emoji: "🌐" },
  { id: "polymarket", label: "Polymarket",     emoji: "🎯" },
];

const TONES = [
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "friendly",     label: "Friendly",     emoji: "😊" },
  { id: "technical",    label: "Technical",    emoji: "⚙️"  },
  { id: "creative",     label: "Creative",     emoji: "✨" },
];

const HOSTING = [
  { id: "self",    label: "Self-host",  price: "Free",  icon: "🖥️" },
  { id: "railway", label: "Railway",   price: "$5/mo", icon: "🚂" },
  { id: "render",  label: "Render",    price: "$7/mo", icon: "☁️" },
];

type Zone = "head" | "face" | "heart" | "hands" | "wallet" | null;

const ZONE_META: Record<NonNullable<Zone>, { emoji: string; title: string; desc: string }> = {
  head:   { emoji: "🧠", title: "Knowledge",      desc: "Skills, Docs, MCP servers"  },
  face:   { emoji: "👁️", title: "Identity",       desc: "Avatar, name, tone"         },
  heart:  { emoji: "❤️", title: "Specialization", desc: "Your agent's core focus"    },
  hands:  { emoji: "🤝", title: "Tools",          desc: "External APIs & integrations"},
  wallet: { emoji: "💰", title: "Settings",       desc: "Pricing, hosting, webhook"  },
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address } = useAccount();

  // Builder state
  const [avatarId, setAvatarId]       = useState("sexy-student");
  const [agentName, setAgentName]     = useState("");
  const [spec, setSpec]               = useState("coding");
  const [skills, setSkills]           = useState<string[]>(["web3", "defi"]);
  const [docs, setDocs]               = useState<string[]>(["polymarket"]);
  const [tools, setTools]             = useState<string[]>(["coingecko", "websearch"]);
  const [tone, setTone]               = useState("professional");
  const [language, setLanguage]       = useState("EN");
  const [price, setPrice]             = useState("");
  const [hosting, setHosting]         = useState("railway");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [mcpUrl, setMcpUrl]           = useState("");
  const [mcpList, setMcpList]         = useState<string[]>([]);

  // UI
  const [activeZone, setActiveZone]   = useState<Zone>(null);
  const [hoverZone, setHoverZone]     = useState<Zone>(null);

  // Contract
  const { data: owner } = useReadContract({
    address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI, functionName: "owner",
  });
  const isOwner = !!(address && owner && address.toLowerCase() === (owner as string).toLowerCase());
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const selectedSpec   = SPECIALIZATIONS.find(s => s.id === spec)!;

  const metaObj = { name: agentName, avatar: avatarId, specialization: spec, skills, docs, tools, tone, language, price, hosting, webhookUrl, mcpList };
  const metaURI = `data:application/json;base64,${typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(JSON.stringify(metaObj)))) : ""}`;
  const agentIdHash = agentName ? keccak256(toBytes(agentName.trim().toLowerCase())) : undefined;
  const canDeploy = !!(agentName && spec && !isPending && !waiting && isOwner);

  const handleDeploy = () => {
    if (!address || !agentIdHash) return;
    writeContract({ address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent", args: [address, agentIdHash, metaURI, webhookUrl] });
  };

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="text-8xl mb-6" style={{ filter: "drop-shadow(0 0 24px #1db8a8)" }}>🤖</div>
        <h1 className="text-4xl font-bold text-forge-white mb-3" style={{ fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.05em" }}>Agent Builder</h1>
        <p className="text-forge-white/50">Connect your wallet to forge your AI agent.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#060c0b" }}>
      {/* Page title */}
      <div className="text-center pt-8 pb-6">
        <h1 className="text-3xl font-bold text-forge-white mb-1" style={{ fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.05em" }}>
          Agent Builder
        </h1>
        <p className="text-forge-white/40 text-sm">Click on any body part to customize · Changes appear live</p>
      </div>

      {!isOwner && (
        <div className="max-w-lg mx-auto mb-6 bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-yellow-400 text-sm flex gap-2">
          <span>⚠️</span><span>Owner-only on-chain action. Configure and share with the owner to deploy.</span>
        </div>
      )}

      <div className="flex items-start justify-center gap-0 relative max-w-6xl mx-auto px-4">

        {/* ── CENTER: Agent Figure ── */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 320 }}>
          {/* Agent name above figure */}
          <div className="mb-4 text-center min-h-[2rem]">
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)", color: selectedSpec.color, letterSpacing: "-0.04em", textShadow: `0 0 20px ${selectedSpec.color}60` }}>
              {agentName || "Your Agent"}
            </span>
          </div>

          {/* SVG Humanoid Figure + Avatar Selector */}
          <HumanoidFigure
            activeZone={activeZone}
            hoverZone={hoverZone}
            specColor={selectedSpec.color}
            selectedAvatarId={avatarId}
            onZoneClick={(z) => setActiveZone(activeZone === z ? null : z)}
            onZoneHover={setHoverZone}
            onAvatarSelect={setAvatarId}
          />

          {/* Zone hint badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {(Object.keys(ZONE_META) as Zone[]).filter(Boolean).map(z => (
              <button key={z} onClick={() => setActiveZone(activeZone === z ? null : z!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: activeZone === z ? "#1db8a822" : "#0a1a17", border: `1px solid ${activeZone === z ? "#1db8a8" : "#1a2e2b"}`, color: activeZone === z ? "#1db8a8" : "#6b8f8a" }}>
                {ZONE_META[z!]!.emoji} {ZONE_META[z!]!.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Panel ── */}
        <div className="flex-1 ml-8" style={{ minHeight: 520 }}>
          {!activeZone ? (
            <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: "#1a2e2b", minHeight: 400 }}>
              <div className="text-6xl mb-4 opacity-30">👈</div>
              <p className="text-forge-white/20 text-sm">Click on a body part<br/>to start customizing</p>
            </div>
          ) : (
            <div className="rounded-2xl p-6 h-full" style={{ background: "#0a1a17", border: "1px solid #1a2e2b", minHeight: 400 }}>
              {/* Panel header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>
                    {ZONE_META[activeZone].emoji} {ZONE_META[activeZone].title}
                  </div>
                  <div className="text-sm text-forge-white/40">{ZONE_META[activeZone].desc}</div>
                </div>
                <button onClick={() => setActiveZone(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-forge-white/30 hover:text-forge-white transition-colors"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>✕</button>
              </div>

              {/* ── HEAD panel ── */}
              {activeZone === "head" && (
                <div className="space-y-6">
                  <div>
                    <SectionLabel>Skills</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {SKILLS.map(sk => (
                        <CheckCard key={sk.id} checked={skills.includes(sk.id)}
                          onClick={() => toggle(skills, setSkills, sk.id)}
                          emoji={sk.emoji} label={sk.label} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Docs (llms.txt)</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {DOCS.map(d => (
                        <CheckCard key={d.id} checked={docs.includes(d.id)}
                          onClick={() => toggle(docs, setDocs, d.id)}
                          emoji={d.emoji} label={d.label} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>MCP Servers</SectionLabel>
                    <div className="space-y-2">
                      {mcpList.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                          <span className="flex-1 truncate">{url}</span>
                          <button onClick={() => setMcpList(l => l.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-400">✕</button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={mcpUrl} onChange={e => setMcpUrl(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && mcpUrl) { setMcpList(l => [...l, mcpUrl]); setMcpUrl(""); }}}
                          placeholder="https://mcp.example.com"
                          className="flex-1 px-3 py-2 rounded-lg text-xs text-forge-white placeholder-forge-white/20 outline-none"
                          style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }} />
                        <button onClick={() => { if (mcpUrl) { setMcpList(l => [...l, mcpUrl]); setMcpUrl(""); }}}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{ background: "#1db8a822", border: "1px solid #1db8a8", color: "#1db8a8" }}>+ Add</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FACE panel ── */}
              {activeZone === "face" && (
                <div className="space-y-6">
                  <div>
                    <SectionLabel>Avatar</SectionLabel>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATARS.map(av => (
                        <button key={av.id} onClick={() => setAvatarId(av.id)}
                          className="flex items-center justify-center text-2xl rounded-xl transition-all"
                          style={{ height: 52, background: avatarId === av.id ? "#1db8a822" : "#060c0b", border: `2px solid ${avatarId === av.id ? "#1db8a8" : "#1a2e2b"}`, transform: avatarId === av.id ? "scale(1.1)" : "scale(1)" }}>
                          {av.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Agent Name</SectionLabel>
                    <input value={agentName} onChange={e => setAgentName(e.target.value)}
                      placeholder="e.g. AlphaScout, DataBot"
                      className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-lg"
                      style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.02em" }} />
                    {agentIdHash && <p className="text-xs mt-1 truncate" style={{ color: "#1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }}>ID: {agentIdHash}</p>}
                  </div>
                  <div>
                    <SectionLabel>Language</SectionLabel>
                    <div className="flex gap-2">
                      {["EN", "Multi"].map(l => (
                        <button key={l} onClick={() => setLanguage(l)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                          style={{ background: language === l ? "#1db8a822" : "#060c0b", border: `1px solid ${language === l ? "#1db8a8" : "#1a2e2b"}`, color: language === l ? "#1db8a8" : "#6b8f8a" }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Tone</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {TONES.map(t => (
                        <button key={t.id} onClick={() => setTone(t.id)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all"
                          style={{ background: tone === t.id ? "#1db8a822" : "#060c0b", border: `1px solid ${tone === t.id ? "#1db8a8" : "#1a2e2b"}`, color: tone === t.id ? "#1db8a8" : "#6b8f8a" }}>
                          <span>{t.emoji}</span> {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── HEART panel ── */}
              {activeZone === "heart" && (
                <div>
                  <SectionLabel>Core Specialization</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {SPECIALIZATIONS.map(sp => (
                      <button key={sp.id} onClick={() => setSpec(sp.id)}
                        className="flex flex-col p-4 rounded-2xl text-left transition-all"
                        style={{ background: spec === sp.id ? `${sp.color}15` : "#060c0b", border: `2px solid ${spec === sp.id ? sp.color : "#1a2e2b"}`, boxShadow: spec === sp.id ? `0 0 20px ${sp.color}30` : "none" }}>
                        <span className="text-3xl mb-2">{sp.emoji}</span>
                        <span className="text-sm font-bold text-forge-white">{sp.label}</span>
                        {spec === sp.id && <span className="text-xs mt-1" style={{ color: sp.color }}>Selected ✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── HANDS panel ── */}
              {activeZone === "hands" && (
                <div>
                  <SectionLabel>External Tools & APIs</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {TOOLS.map(t => (
                      <CheckCard key={t.id} checked={tools.includes(t.id)}
                        onClick={() => toggle(tools, setTools, t.id)}
                        emoji={t.emoji} label={t.label} accent="#f07828" />
                    ))}
                  </div>
                </div>
              )}

              {/* ── WALLET panel ── */}
              {activeZone === "wallet" && (
                <div className="space-y-5">
                  <div>
                    <SectionLabel>Price per Task</SectionLabel>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-forge-white/30">$</span>
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                        placeholder="25"
                        className="flex-1 px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-2xl font-bold"
                        style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }} />
                      <span className="text-sm text-forge-white/40">USDC</span>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Hosting</SectionLabel>
                    <div className="space-y-2">
                      {HOSTING.map(h => (
                        <button key={h.id} onClick={() => setHosting(h.id)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                          style={{ background: hosting === h.id ? "#1db8a815" : "#060c0b", border: `1px solid ${hosting === h.id ? "#1db8a8" : "#1a2e2b"}` }}>
                          <span className="text-2xl">{h.icon}</span>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-forge-white">{h.label}</div>
                          </div>
                          <span className="text-sm font-bold" style={{ color: h.id === "self" ? "#3ec95a" : "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>{h.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <button onClick={() => setWebhookOpen(o => !o)}
                      className="flex items-center gap-2 text-sm transition-colors"
                      style={{ color: webhookOpen ? "#1db8a8" : "#6b8f8a" }}>
                      <span style={{ transform: webhookOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
                      Webhook URL <span className="text-forge-white/30">(advanced)</span>
                    </button>
                    {webhookOpen && (
                      <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://your-agent.app/hook"
                        className="w-full mt-2 px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                        style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }} />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Deploy button ── */}
      <div className="flex justify-center mt-12 pb-16">
        {isSuccess ? (
          <div className="px-8 py-4 rounded-2xl text-base font-semibold" style={{ background: "#3ec95a20", border: "1px solid #3ec95a", color: "#3ec95a" }}>
            🎉 Agent deployed on-chain!
          </div>
        ) : (
          <button onClick={handleDeploy} disabled={!canDeploy}
            className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base font-bold transition-all"
            style={{
              background: canDeploy ? "linear-gradient(135deg, #f07828, #d05e10)" : "#0a1a17",
              border: `1px solid ${canDeploy ? "#f07828" : "#1a2e2b"}`,
              color: canDeploy ? "white" : "#1a2e2b",
              boxShadow: canDeploy ? "0 0 30px #f0782840" : "none",
              fontFamily: "var(--font-space-grotesk)",
              letterSpacing: "-0.02em",
              cursor: canDeploy ? "pointer" : "not-allowed",
            }}>
            {isPending || waiting ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Deploying…</>
            ) : (
              <><span>⚡</span> Deploy Agent {!agentName && <span className="text-sm font-normal opacity-60 ml-1">— enter a name first</span>}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>
      {children}
    </div>
  );
}

function CheckCard({ checked, onClick, emoji, label, accent = "#1db8a8" }: {
  checked: boolean; onClick: () => void; emoji: string; label: string; accent?: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
      style={{ background: checked ? `${accent}15` : "#060c0b", border: `1px solid ${checked ? accent : "#1a2e2b"}` }}>
      <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors"
        style={{ background: checked ? accent : "transparent", border: `1.5px solid ${checked ? accent : "#1a2e2b"}` }}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-base">{emoji}</span>
      <span className="text-xs text-forge-white/70">{label}</span>
    </button>
  );
}
