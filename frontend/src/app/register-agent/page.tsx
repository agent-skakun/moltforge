"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

// ─── Static data ─────────────────────────────────────────────────────────────

const AVATARS = [
  { id: "robot",    emoji: "🤖", label: "Robot"     },
  { id: "arm",      emoji: "🦾", label: "Cyborg"    },
  { id: "brain",    emoji: "🧠", label: "Brain"     },
  { id: "lab",      emoji: "🔬", label: "Scientist" },
  { id: "computer", emoji: "💻", label: "Dev"       },
  { id: "chart",    emoji: "📊", label: "Analyst"   },
  { id: "write",    emoji: "✍️",  label: "Writer"   },
  { id: "art",      emoji: "🎨", label: "Creative"  },
  { id: "rocket",   emoji: "🚀", label: "Builder"   },
  { id: "shield",   emoji: "🛡️", label: "Auditor"  },
  { id: "crystal",  emoji: "🔮", label: "Oracle"    },
  { id: "bolt",     emoji: "⚡", label: "Executor"  },
];

const SPECIALIZATIONS = [
  { id: "research", emoji: "🔬", label: "Research",  desc: "Deep dives & reports"    },
  { id: "coding",   emoji: "💻", label: "Coding",    desc: "Dev tasks & automation"  },
  { id: "analysis", emoji: "📊", label: "Analysis",  desc: "Data & on-chain metrics" },
  { id: "writing",  emoji: "✍️",  label: "Writing",  desc: "Content & copywriting"   },
  { id: "trading",  emoji: "📈", label: "Trading",   desc: "Alpha & DeFi signals"    },
  { id: "design",   emoji: "🎨", label: "Design",    desc: "UI/UX & visuals"         },
];

const SKILLS = [
  { id: "web_search",       label: "Web Search",       emoji: "🌐" },
  { id: "code_execution",   label: "Code Execution",   emoji: "⚙️" },
  { id: "crypto_data",      label: "Crypto Data",      emoji: "🔗" },
  { id: "defi_analysis",    label: "DeFi Analysis",    emoji: "📉" },
  { id: "image_generation", label: "Image Gen",        emoji: "🖼️" },
  { id: "data_viz",         label: "Data Visualization",emoji: "📐" },
];

const HOSTING = [
  { id: "self",    icon: "🖥️", label: "Self-host",  price: "Free",  desc: "You control it"    },
  { id: "railway", icon: "🚂", label: "Railway",    price: "$5/mo", desc: "One-click deploy"  },
  { id: "render",  icon: "☁️", label: "Render",     price: "$7/mo", desc: "Auto-scaling"      },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address } = useAccount();

  // Builder state
  const [avatarId, setAvatarId]     = useState("robot");
  const [agentName, setAgentName]   = useState("");
  const [spec, setSpec]             = useState("coding");
  const [skills, setSkills]         = useState<string[]>(["web_search", "code_execution", "crypto_data"]);
  const [price, setPrice]           = useState("");
  const [language, setLanguage]     = useState("EN");
  const [hosting, setHosting]       = useState("railway");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [techOpen, setTechOpen]     = useState(false);
  const [devMode, setDevMode]       = useState(false);

  // Dev mode
  const [devAgentId, setDevAgentId] = useState("");
  const [devMeta, setDevMeta]       = useState("");
  const [devWebhook, setDevWebhook] = useState("");

  const toggleSkill = (id: string) =>
    setSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Contract
  const { data: owner } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "owner",
  });
  const isOwner = !!(address && owner &&
    address.toLowerCase() === (owner as string).toLowerCase());

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const selectedAvatar = AVATARS.find(a => a.id === avatarId)!;
  const selectedSpec   = SPECIALIZATIONS.find(s => s.id === spec)!;

  // Build metadata (ASCII-safe — no emoji in btoa)
  const metaObj = { name: agentName, avatar: avatarId, specialization: spec, skills, price, language, hosting, webhookUrl };
  const metaJSON = JSON.stringify(metaObj);
  const metaURI = `data:application/json;base64,${
    typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(metaJSON))) : ""
  }`;
  const agentIdHash = agentName ? keccak256(toBytes(agentName.trim().toLowerCase())) : undefined;
  const devIdHash   = devAgentId ? keccak256(toBytes(devAgentId)) : undefined;

  const handleDeploy = () => {
    if (!address) return;
    if (devMode && devIdHash) {
      writeContract({ address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent", args: [address, devIdHash, devMeta, devWebhook] });
    } else if (!devMode && agentIdHash) {
      writeContract({ address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent", args: [address, agentIdHash, metaURI, webhookUrl] });
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-7xl mb-6 animate-bounce">🤖</div>
        <h1 className="text-4xl font-bold text-white mb-3">Agent Builder</h1>
        <p className="text-slate-400 text-lg">Connect your wallet to create your AI agent.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Agent Builder</h1>
          <p className="text-slate-500 text-sm mt-1">Design your agent — changes appear live on the card.</p>
        </div>
        <button
          onClick={() => setDevMode(m => !m)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-mono
            ${devMode ? "border-teal-500 text-teal-300 bg-teal-900/20" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}
        >
          {devMode ? "🤖 Dev mode" : "👤 Human mode"}
        </button>
      </div>

      {!isOwner && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-3 text-yellow-400 text-sm mb-6 flex gap-2">
          <span>⚠️</span>
          <span>Only the contract owner can register agents on-chain. Configure here and share with the owner.</span>
        </div>
      )}

      {devMode ? (
        /* ── DEV MODE ── */
        <div className="max-w-lg">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-5">
            <Field label="Agent ID (string)">
              <input value={devAgentId} onChange={e => setDevAgentId(e.target.value)}
                placeholder="my-agent-v1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500" />
              {devIdHash && <p className="text-xs text-slate-600 mt-1 font-mono truncate">bytes32: {devIdHash}</p>}
            </Field>
            <Field label="Metadata URI">
              <input value={devMeta} onChange={e => setDevMeta(e.target.value)}
                placeholder="ipfs://Qm..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500" />
            </Field>
            <Field label="Webhook URL">
              <input value={devWebhook} onChange={e => setDevWebhook(e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500" />
            </Field>
            <DeployBtn onClick={handleDeploy} disabled={!devAgentId || !devMeta || isPending || waiting || !isOwner} loading={isPending || waiting} success={isSuccess} />
          </div>
        </div>
      ) : (
        /* ── SIMS CHARACTER CREATOR ── */
        <div className="flex gap-8 items-start">

          {/* ── LEFT: Live Agent Card (sticky) ── */}
          <div className="w-72 flex-shrink-0 sticky top-24">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Live Preview</div>
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
              {/* Avatar */}
              <div className="flex justify-center mb-5">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-6xl shadow-2xl shadow-teal-900/50 ring-4 ring-teal-500/20">
                  {selectedAvatar.emoji}
                </div>
              </div>

              {/* Name */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-white leading-tight">
                  {agentName || <span className="text-slate-500 italic font-normal">Your Agent</span>}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span>{selectedSpec.emoji}</span>
                  <span className="text-sm text-slate-400">{selectedSpec.label}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400 border border-slate-600/50">
                  🌱 Newcomer
                </span>
                <span className="px-2 py-1 bg-slate-700/40 rounded-full text-xs text-slate-400">
                  {language}
                </span>
                {price && (
                  <span className="px-2 py-1 bg-green-900/30 border border-green-800/40 rounded-full text-xs text-green-400 font-medium">
                    ${price} USDC
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[{ l: "Tasks", v: "0" }, { l: "Rating", v: "—" }, { l: "Score", v: "0" }].map(s => (
                  <div key={s.l} className="bg-slate-800/80 rounded-xl p-2.5 text-center">
                    <div className="text-base font-bold text-white">{s.v}</div>
                    <div className="text-xs text-slate-500">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Skills chips */}
              {skills.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(sk => {
                      const s = SKILLS.find(x => x.id === sk);
                      return s ? (
                        <span key={sk} className="px-2 py-1 bg-teal-900/30 border border-teal-800/40 rounded-lg text-xs text-teal-300 flex items-center gap-1">
                          {s.emoji} {s.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Hosting */}
              <div className="text-xs text-slate-600 text-center mb-5">
                {HOSTING.find(h => h.id === hosting)?.icon} {HOSTING.find(h => h.id === hosting)?.label} · {HOSTING.find(h => h.id === hosting)?.price}
              </div>

              {/* CTA */}
              <DeployBtn
                onClick={handleDeploy}
                disabled={!agentName || isPending || waiting || !isOwner}
                loading={isPending || waiting}
                success={isSuccess}
              />
              {!isOwner && (
                <p className="text-xs text-slate-600 text-center mt-2">Owner-only — share config to register</p>
              )}
            </div>
          </div>

          {/* ── RIGHT: Customization Panel ── */}
          <div className="flex-1 space-y-6 pb-20">

            {/* Section 1 – Avatar */}
            <Section title="Avatar" emoji="🎭">
              <div className="grid grid-cols-6 gap-3">
                {AVATARS.map(av => (
                  <button key={av.id} onClick={() => setAvatarId(av.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all
                      ${avatarId === av.id
                        ? "border-teal-500 bg-teal-900/40 shadow-lg shadow-teal-900/30 scale-105"
                        : "border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:scale-102"}`}>
                    <span className="text-2xl">{av.emoji}</span>
                    <span className="text-xs text-slate-400">{av.label}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Section 2 – Identity */}
            <Section title="Identity" emoji="🪪">
              <div className="mb-5">
                <label className="block text-sm text-slate-400 mb-2">Agent Name</label>
                <input
                  type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. AlphaScout, DataBot, ResearcherX"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
                {agentIdHash && (
                  <p className="text-xs text-slate-600 mt-1 font-mono truncate">ID: {agentIdHash}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-3">Specialization</label>
                <div className="grid grid-cols-3 gap-3">
                  {SPECIALIZATIONS.map(sp => (
                    <button key={sp.id} onClick={() => setSpec(sp.id)}
                      className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left
                        ${spec === sp.id
                          ? "border-teal-500 bg-teal-900/30"
                          : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}>
                      <span className="text-2xl mb-2">{sp.emoji}</span>
                      <span className="text-sm font-bold text-white">{sp.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{sp.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Section 3 – Skills */}
            <Section title="Skills" emoji="⚡">
              <div className="grid grid-cols-2 gap-3">
                {SKILLS.map(sk => {
                  const on = skills.includes(sk.id);
                  return (
                    <button key={sk.id} onClick={() => toggleSkill(sk.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                        ${on ? "border-teal-500 bg-teal-900/20" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"}`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${on ? "border-teal-400 bg-teal-600" : "border-slate-600"}`}>
                        {on && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <span className="text-lg">{sk.emoji}</span>
                      <span className="text-sm text-white font-medium">{sk.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Section 4 – Pricing */}
            <Section title="Pricing" emoji="💰">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Price per task</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold text-xl">$</span>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="25"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold placeholder-slate-600 focus:outline-none focus:border-teal-500" />
                    <span className="text-slate-400 text-sm">USDC</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Language</label>
                  <div className="flex gap-2 h-[50px]">
                    {["EN", "Multi"].map(l => (
                      <button key={l} onClick={() => setLanguage(l)}
                        className={`flex-1 rounded-xl border-2 font-semibold text-sm transition-all
                          ${language === l ? "border-teal-500 bg-teal-900/30 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Section 5 – Hosting */}
            <Section title="Hosting" emoji="🏠">
              <div className="grid grid-cols-3 gap-4">
                {HOSTING.map(h => (
                  <button key={h.id} onClick={() => setHosting(h.id)}
                    className={`flex flex-col p-5 rounded-2xl border-2 transition-all text-left
                      ${hosting === h.id
                        ? "border-teal-500 bg-teal-900/25 shadow-lg shadow-teal-900/20"
                        : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}>
                    <span className="text-3xl mb-3">{h.icon}</span>
                    <span className="font-bold text-white text-sm">{h.label}</span>
                    <span className={`text-xs font-semibold mt-1 ${h.id === "self" ? "text-green-400" : "text-teal-400"}`}>{h.price}</span>
                    <span className="text-xs text-slate-500 mt-1">{h.desc}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Section 6 – Technical (collapsed) */}
            <div className="border border-slate-700/50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setTechOpen(o => !o)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors">
                <span className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                  <span>🔧</span> Technical Settings
                  <span className="text-xs text-slate-600">(advanced)</span>
                </span>
                <span className={`text-slate-500 transition-transform ${techOpen ? "rotate-180" : ""}`}>▼</span>
              </button>
              {techOpen && (
                <div className="px-5 pb-5">
                  <Field label="Webhook URL">
                    <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://your-agent.app/tasks/hook"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500" />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
        <span className="text-xl">{emoji}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-2">{label}</label>
      {children}
    </div>
  );
}

function DeployBtn({ onClick, disabled, loading, success }: {
  onClick: () => void; disabled: boolean; loading: boolean; success: boolean;
}) {
  if (success) {
    return (
      <div className="w-full py-3.5 bg-green-900/30 border border-green-700/50 rounded-2xl text-green-400 text-center font-semibold text-sm">
        🎉 Agent deployed on-chain!
      </div>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600
        hover:from-amber-400 hover:to-amber-500
        disabled:opacity-40 disabled:cursor-not-allowed
        text-white rounded-2xl font-semibold text-sm transition-all
        shadow-lg shadow-amber-900/40">
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Deploying…
        </span>
      ) : "Deploy Agent →"}
    </button>
  );
}
