"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { HumanoidFigure } from "@/components/HumanoidFigure";
import { PRESETS, SKIN_COLORS, FaceParams } from "@/components/AvatarFace";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// ─── Data ─────────────────────────────────────────────────────────────────────

const SPECIALIZATIONS = [
  { id: "research", emoji: "🔬", label: "Research",  color: "#1db8a8" },
  { id: "coding",   emoji: "💻", label: "Coding",    color: "#f07828" },
  { id: "analysis", emoji: "📊", label: "Analysis",  color: "#3ec95a" },
  { id: "writing",  emoji: "✍️",  label: "Writing",  color: "#e8c842" },
  { id: "trading",  emoji: "📈", label: "Trading",   color: "#e63030" },
  { id: "design",   emoji: "🎨", label: "Design",    color: "#9b59b6" },
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

// Category icons for skill groups
const CATEGORY_ICONS: Record<string, string> = {
  "blockchain":       "⛓️",
  "data-analytics":   "📊",
  "defi-trading":     "💱",
  "infrastructure":   "🛠️",
  "prediction-markets":"🎯",
  "research":         "🔬",
  "ai-compute":       "🤖",
  "general":          "📄",
};

type Zone = "head" | "face" | "heart" | "hands" | "wallet" | null;

interface SkillItem { id: string; label: string; path: string; category: string }
interface SkillGroups { [category: string]: SkillItem[] }

const ZONE_META: Record<NonNullable<Zone>, { emoji: string; title: string; desc: string }> = {
  head:   { emoji: "🧠", title: "Knowledge",      desc: "Skills from moltforge-skills repo"  },
  face:   { emoji: "👁️", title: "Identity",       desc: "Avatar, name, tone"                 },
  heart:  { emoji: "❤️", title: "Specialization", desc: "Your agent's core focus"            },
  hands:  { emoji: "🤝", title: "Tools",          desc: "External APIs & integrations"       },
  wallet: { emoji: "💰", title: "Settings",       desc: "Pricing, hosting, webhook"          },
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address } = useAccount();

  // Builder state
  const [avatarId, setAvatarId]       = useState("developer");
  const [faceParams, setFaceParams]   = useState<FaceParams>(PRESETS["developer"]);
  const [agentName, setAgentName]     = useState("");
  const [spec, setSpec]               = useState("coding");
  const [skills, setSkills]           = useState<string[]>([]);
  const [tools, setTools]             = useState<string[]>(["coingecko", "websearch"]);
  const [tone, setTone]               = useState("professional");
  const [language] = useState("EN");
  const [price, setPrice]             = useState("");
  const [hosting, setHosting]         = useState("railway");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [mcpUrl, setMcpUrl]           = useState("");
  const [mcpList, setMcpList]         = useState<string[]>([]);

  // Dynamic skills from moltforge-skills repo
  const [skillGroups, setSkillGroups] = useState<SkillGroups>({});
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    setSkillsLoading(true);
    fetch("/api/skills?action=list")
      .then(r => r.json())
      .then(data => {
        if (data.groups) {
          setSkillGroups(data.groups);
          // Auto-expand first category
          const firstCat = Object.keys(data.groups)[0];
          if (firstCat) setExpandedCategories([firstCat]);
        }
      })
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, []);

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

  // Generate docker entrypoint snippet for selected skills
  const generateDockerEntrypoint = () => {
    if (skills.length === 0) return "";
    const RAW_BASE = "https://raw.githubusercontent.com/agent-skakun/moltforge-skills/main";
    const skillDownloads = skills.map(path =>
      `curl -s "${RAW_BASE}/${path}" -o "/skills/${path.replace(/\//g, '_')}"`
    ).join(" && \\\n  ");
    return `#!/bin/sh\nmkdir -p /skills\n${skillDownloads}\nexec "$@"`;
  };

  const metaObj = {
    name: agentName,
    avatar: avatarId,
    specialization: spec,
    skills,                    // array of paths e.g. ["blockchain/erc8004.md"]
    tools,
    tone,
    language,
    price,
    hosting,
    webhookUrl,
    mcpList,
    systemPrompt: skills.length > 0
      ? `You have access to skill files in /skills/ directory. Read them to understand how to work with specific tools and protocols. Skills loaded: ${skills.map(p => p.split('/').pop()?.replace('.md','')).join(', ')}.`
      : undefined,
    dockerEntrypoint: generateDockerEntrypoint() || undefined,
  };
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

  // Wallet gate removed — form always visible. Wallet needed only for tx.
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
            faceParams={faceParams}
            onZoneClick={(z) => setActiveZone(activeZone === z ? null : z)}
            onZoneHover={setHoverZone}
            onAvatarSelect={(id) => { setAvatarId(id); setFaceParams(PRESETS[id] ?? faceParams); }}
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

              {/* ── HEAD panel — moltforge-skills repo ── */}
              {activeZone === "head" && (
                <div className="space-y-4">
                  <div className="text-xs mb-3" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                    From <span style={{color:"#1db8a8"}}>agent-skakun/moltforge-skills</span> repo
                  </div>
                  {skillsLoading && (
                    <div className="text-xs text-center py-4" style={{color:"#3a5550"}}>Loading skills…</div>
                  )}
                  {!skillsLoading && Object.keys(skillGroups).length === 0 && (
                    <div className="text-xs text-center py-4" style={{color:"#e63030"}}>Failed to load skills</div>
                  )}
                  {Object.entries(skillGroups).map(([cat, items]) => (
                    <div key={cat}>
                      <button
                        onClick={() => setExpandedCategories(prev =>
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        )}
                        className="flex items-center gap-2 w-full text-left mb-2"
                        style={{ color: "#1db8a8" }}
                      >
                        <span>{CATEGORY_ICONS[cat] || "📄"}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{fontFamily:"var(--font-jetbrains-mono)"}}>
                          {cat.replace(/-/g, " ")}
                        </span>
                        <span className="text-xs ml-auto" style={{color:"#3a5550"}}>
                          {items.filter(s => skills.includes(s.path)).length}/{items.length}
                        </span>
                        <span style={{fontSize:"0.65rem",color:"#3a5550"}}>
                          {expandedCategories.includes(cat) ? "▲" : "▼"}
                        </span>
                      </button>
                      {expandedCategories.includes(cat) && (
                        <div className="grid grid-cols-1 gap-1.5 pl-2">
                          {items.map(sk => (
                            <CheckCard key={sk.path} checked={skills.includes(sk.path)}
                              onClick={() => toggle(skills, setSkills, sk.path)}
                              emoji={CATEGORY_ICONS[cat] || "📄"} label={sk.label} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {skills.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg text-xs" style={{background:"#060c0b",border:"1px solid #1db8a820"}}>
                      <div className="mb-1" style={{color:"#1db8a8",fontFamily:"var(--font-jetbrains-mono)"}}>Selected ({skills.length}):</div>
                      {skills.map(p => (
                        <div key={p} className="flex items-center gap-1" style={{color:"#5a807a"}}>
                          <span>✓</span>
                          <span className="truncate">{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* ── FACE panel — APPEARANCE constructor ── */}
              {activeZone === "face" && (
                <div className="space-y-5 overflow-y-auto" style={{maxHeight:480}}>

                  {/* Preset quick-select */}
                  <div>
                    <SectionLabel>Preset</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(PRESETS).map(pid => (
                        <button key={pid}
                          onClick={() => { setAvatarId(pid); setFaceParams({...PRESETS[pid]}); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                          style={{
                            background: avatarId === pid ? "#1db8a822" : "#060c0b",
                            border: `1px solid ${avatarId === pid ? "#1db8a8" : "#1a2e2b"}`,
                            color: avatarId === pid ? "#1db8a8" : "#6b8f8a"
                          }}>
                          {pid.replace(/-/g," ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Color */}
                  <div>
                    <SectionLabel>Skin Color</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {SKIN_COLORS.map(c => (
                        <button key={c} onClick={() => setFaceParams(p=>({...p,skinColor:c}))}
                          title={c}
                          style={{
                            width:28, height:28, borderRadius:"50%", background:c,
                            border: faceParams.skinColor === c ? "3px solid #1db8a8" : "2px solid #1a2e2b",
                            cursor:"pointer", transition:"all 0.15s"
                          }}/>
                      ))}
                    </div>
                  </div>

                  {/* Face Shape */}
                  <div>
                    <SectionLabel>Face Shape</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["oval","round","square","heart","diamond","oblong"] as FaceParams["faceShape"][]).map(s => (
                        <button key={s} onClick={() => setFaceParams(p=>({...p,faceShape:s}))}
                          className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.faceShape===s ? "#1db8a822" : "#060c0b",
                            border:`1px solid ${faceParams.faceShape===s ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.faceShape===s ? "#1db8a8":"#6b8f8a"
                          }}>{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Style */}
                  <div>
                    <SectionLabel>Hair Style</SectionLabel>
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
                      {(["short","long","curly","bald","ponytail","afro","business","mohawk","undercut","buzz","bun","wavy","dreadlocks","braids","pixie","bob"] as FaceParams["hair"][]).map(h => (
                        <button key={h} onClick={() => setFaceParams(p=>({...p,hair:h}))}
                          className="px-3 py-1.5 rounded-lg text-xs capitalize whitespace-nowrap transition-all flex-shrink-0"
                          style={{
                            background: faceParams.hair===h ? "#1db8a822" : "#060c0b",
                            border:`1px solid ${faceParams.hair===h ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.hair===h ? "#1db8a8":"#6b8f8a"
                          }}>{h}</button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Color */}
                  <div>
                    <SectionLabel>Hair Color</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {({"black":"#1a1008","brown":"#4a2f1a","blonde":"#d4a843","red":"#8b2500","gray":"#8a8a8a","white":"#e8e8e8","platinum":"#dde0e8","auburn":"#6b2000"} as Record<string,string>).toString() && 
                        Object.entries({"black":"#1a1008","brown":"#4a2f1a","blonde":"#d4a843","red":"#8b2500","gray":"#8a8a8a","white":"#e8e8e8","platinum":"#dde0e8","auburn":"#6b2000"}).map(([name,hex]) => (
                        <button key={name} onClick={() => setFaceParams(p=>({...p,hairColor:name as FaceParams["hairColor"]}))}
                          title={name}
                          style={{
                            width:26, height:26, borderRadius:"50%", background:hex,
                            border: faceParams.hairColor===name ? "3px solid #1db8a8":"2px solid #1a2e2b",
                            cursor:"pointer", outline: hex === "#e8e8e8" ? "1px solid #2a3a38" : "none"
                          }}/>
                      ))}
                    </div>
                  </div>

                  {/* Eyes */}
                  <div>
                    <SectionLabel>Eyes</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["normal","asian","wide","tired","hooded","deep","almond","round"] as FaceParams["eyes"][]).map(e => (
                        <button key={e} onClick={() => setFaceParams(p=>({...p,eyes:e}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.eyes===e ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.eyes===e ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.eyes===e ? "#1db8a8":"#6b8f8a"
                          }}>{e}</button>
                      ))}
                    </div>
                  </div>

                  {/* Facial Hair */}
                  <div>
                    <SectionLabel>Facial Hair</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["none","stubble","short","full","goatee","mustache","viking","thick"] as FaceParams["facialHair"][]).map(b => (
                        <button key={b} onClick={() => setFaceParams(p=>({...p,facialHair:b}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.facialHair===b ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.facialHair===b ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.facialHair===b ? "#1db8a8":"#6b8f8a"
                          }}>{b}</button>
                      ))}
                    </div>
                  </div>

                  {/* Makeup */}
                  <div>
                    <SectionLabel>Makeup</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["none","natural","light","bold","goth"] as FaceParams["makeup"][]).map(m => (
                        <button key={m} onClick={() => setFaceParams(p=>({...p,makeup:m}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.makeup===m ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.makeup===m ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.makeup===m ? "#1db8a8":"#6b8f8a"
                          }}>{m}</button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Detail */}
                  <div>
                    <SectionLabel>Skin Detail</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["none","freckles","moles","wrinkles","scar"] as FaceParams["skinDetail"][]).map(sd => (
                        <button key={sd} onClick={() => setFaceParams(p=>({...p,skinDetail:sd}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.skinDetail===sd ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.skinDetail===sd ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.skinDetail===sd ? "#1db8a8":"#6b8f8a"
                          }}>{sd}</button>
                      ))}
                    </div>
                  </div>

                  {/* Glasses */}
                  <div>
                    <SectionLabel>Glasses</SectionLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(["none","round","square","oval","cat-eye","rimless"] as FaceParams["glasses"][]).map(g => (
                        <button key={g} onClick={() => setFaceParams(p=>({...p,glasses:g}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.glasses===g ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.glasses===g ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.glasses===g ? "#1db8a8":"#6b8f8a"
                          }}>{g}</button>
                      ))}
                    </div>
                    {faceParams.glasses !== "none" && (
                      <div className="flex flex-wrap gap-2">
                        {["#111","#6b4020","#c8a040","#aaa","#fff","#8b3a00","#1a3a8b","#8b1a1a"].map(c => (
                          <button key={c} onClick={() => setFaceParams(p=>({...p,glassesColor:c}))}
                            title={c} style={{width:22,height:22,borderRadius:4,background:c,border:faceParams.glassesColor===c?"3px solid #1db8a8":"2px solid #1a2e2b",cursor:"pointer"}}/>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hat */}
                  <div>
                    <SectionLabel>Hat</SectionLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(["none","cap","beanie","fedora","hood","crown","beret","hardhat"] as FaceParams["hat"][]).map(h => (
                        <button key={h} onClick={() => setFaceParams(p=>({...p,hat:h}))}
                          className="px-2.5 py-1.5 rounded-lg text-xs capitalize transition-all"
                          style={{
                            background: faceParams.hat===h ? "#1db8a822":"#060c0b",
                            border:`1px solid ${faceParams.hat===h ? "#1db8a8":"#1a2e2b"}`,
                            color: faceParams.hat===h ? "#1db8a8":"#6b8f8a"
                          }}>{h}</button>
                      ))}
                    </div>
                    {faceParams.hat !== "none" && (
                      <div className="flex flex-wrap gap-2">
                        {["#111","#fff","#8b1a1a","#1a3a8b","#1a6b1a","#e8c830","#555","#6b4020"].map(c => (
                          <button key={c} onClick={() => setFaceParams(p=>({...p,hatColor:c}))}
                            title={c} style={{width:22,height:22,borderRadius:4,background:c,border:faceParams.hatColor===c?"3px solid #1db8a8":"2px solid #1a2e2b",cursor:"pointer"}}/>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Extras */}
                  <div>
                    <SectionLabel>Extras</SectionLabel>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <div className="text-xs mb-1.5" style={{color:"#3a5550",fontFamily:"var(--font-jetbrains-mono)"}}>Earrings</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["none","studs","hoops","drops","dangles","cuffs"] as FaceParams["earrings"][]).map(e => (
                            <button key={e} onClick={() => setFaceParams(p=>({...p,earrings:e}))}
                              className="px-2 py-1 rounded text-xs capitalize"
                              style={{background:faceParams.earrings===e?"#1db8a822":"#060c0b",border:`1px solid ${faceParams.earrings===e?"#1db8a8":"#1a2e2b"}`,color:faceParams.earrings===e?"#1db8a8":"#6b8f8a"}}>{e}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-1.5" style={{color:"#3a5550",fontFamily:"var(--font-jetbrains-mono)"}}>Piercing</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["none","nose","lip","eyebrow","multiple"] as FaceParams["piercing"][]).map(p => (
                            <button key={p} onClick={() => setFaceParams(fp=>({...fp,piercing:p}))}
                              className="px-2 py-1 rounded text-xs capitalize"
                              style={{background:faceParams.piercing===p?"#1db8a822":"#060c0b",border:`1px solid ${faceParams.piercing===p?"#1db8a8":"#1a2e2b"}`,color:faceParams.piercing===p?"#1db8a8":"#6b8f8a"}}>{p}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-1.5" style={{color:"#3a5550",fontFamily:"var(--font-jetbrains-mono)"}}>Tattoo</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["none","neck","face","tear","tribal","circuit"] as FaceParams["tattoo"][]).map(t => (
                            <button key={t} onClick={() => setFaceParams(p=>({...p,tattoo:t}))}
                              className="px-2 py-1 rounded text-xs capitalize"
                              style={{background:faceParams.tattoo===t?"#1db8a822":"#060c0b",border:`1px solid ${faceParams.tattoo===t?"#1db8a8":"#1a2e2b"}`,color:faceParams.tattoo===t?"#1db8a8":"#6b8f8a"}}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs mb-1.5" style={{color:"#3a5550",fontFamily:"var(--font-jetbrains-mono)"}}>Necklace</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["none","chain","pendant","choker","beads"] as FaceParams["necklace"][]).map(n => (
                            <button key={n} onClick={() => setFaceParams(p=>({...p,necklace:n}))}
                              className="px-2 py-1 rounded text-xs capitalize"
                              style={{background:faceParams.necklace===n?"#1db8a822":"#060c0b",border:`1px solid ${faceParams.necklace===n?"#1db8a8":"#1a2e2b"}`,color:faceParams.necklace===n?"#1db8a8":"#6b8f8a"}}>{n}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name / Tone — kept here too */}
                  <div>
                    <SectionLabel>Agent Name</SectionLabel>
                    <input value={agentName} onChange={e => setAgentName(e.target.value)}
                      placeholder="e.g. AlphaScout, DataBot"
                      className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-lg"
                      style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.02em" }} />
                    {agentIdHash && <p className="text-xs mt-1 truncate" style={{ color: "#1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }}>ID: {agentIdHash}</p>}
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
        ) : !address ? (
          /* No wallet — show ConnectButton inline */
          <div className="flex flex-col items-center gap-3">
            <ConnectButton label="Connect Wallet to Deploy" />
            <p className="text-xs" style={{ color: "#3a5550" }}>Wallet needed only for on-chain registration</p>
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
