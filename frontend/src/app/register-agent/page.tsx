"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

// ─── Data ────────────────────────────────────────────────────────────────────

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
];

const SKILLS = [
  { id: "web_search",     label: "Web Search",    emoji: "🌐" },
  { id: "code_execution", label: "Code Execution",emoji: "⚙️" },
  { id: "crypto_data",    label: "Crypto Data",   emoji: "🔗" },
  { id: "defi_analysis",  label: "DeFi Analysis", emoji: "📉" },
  { id: "writing",        label: "Writing",        emoji: "✍️" },
];

const HOSTING = [
  { id: "self",    icon: "🖥️", label: "My Computer", price: "Free",  desc: "Self-hosted, you control it"      },
  { id: "railway", icon: "🚂", label: "Railway",     price: "$5/mo", desc: "One-click cloud deploy"           },
  { id: "render",  icon: "☁️", label: "Render",      price: "$7/mo", desc: "Auto-scaling cloud"               },
];

const LANGUAGES = ["EN", "RU", "Multi"];

const STEPS = [
  { n: 1, label: "Avatar"         },
  { n: 2, label: "Who is it?"     },
  { n: 3, label: "Skills"         },
  { n: 4, label: "Pricing"        },
  { n: 5, label: "Hosting"        },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address } = useAccount();
  const [mode, setMode] = useState<"human" | "dev">("human");

  // Human wizard state
  const [step, setStep]               = useState(1);
  const [avatarId, setAvatarId]       = useState("robot");
  const [agentName, setAgentName]     = useState("");
  const [spec, setSpec]               = useState("coding");
  const [skills, setSkills]           = useState<string[]>(["web_search", "code_execution", "crypto_data"]);
  const [price, setPrice]             = useState("");
  const [language, setLanguage]       = useState("EN");
  const [hosting, setHosting]         = useState("railway");
  const [webhookUrl, setWebhookUrl]   = useState("");

  // Dev mode state
  const [devAgentId, setDevAgentId]   = useState("");
  const [devMeta, setDevMeta]         = useState("");
  const [devWebhook, setDevWebhook]   = useState("");

  const toggleSkill = (id: string) =>
    setSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Contract
  const { data: owner } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "owner",
  });
  const isOwner = !!(address && owner && address.toLowerCase() === (owner as string).toLowerCase());

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const selectedAvatar = AVATARS.find(a => a.id === avatarId)!;
  const selectedSpec   = SPECIALIZATIONS.find(s => s.id === spec)!;

  // Human mode: build metadata + hash automatically
  const humanMeta = JSON.stringify({
    name: agentName, avatar: selectedAvatar.emoji, specialization: spec,
    skills, price, language, hosting, webhookUrl,
  });
  const humanMetaURI  = `data:application/json;base64,${typeof window !== "undefined" ? btoa(humanMeta) : ""}`;
  const humanIdHash   = agentName ? keccak256(toBytes(agentName.trim().toLowerCase())) : undefined;

  // Dev mode
  const devIdHash = devAgentId ? keccak256(toBytes(devAgentId)) : undefined;

  const handleRegister = () => {
    if (!address) return;
    if (mode === "human" && humanIdHash) {
      writeContract({
        address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [address, humanIdHash, humanMetaURI, webhookUrl],
      });
    } else if (mode === "dev" && devIdHash) {
      writeContract({
        address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [address, devIdHash, devMeta, devWebhook],
      });
    }
  };

  if (!address) {
    return (
      <div className="text-center py-24">
        <div className="text-6xl mb-6">🤖</div>
        <h1 className="text-3xl font-bold text-white mb-3">Agent Builder</h1>
        <p className="text-slate-400">Connect your wallet to create your AI agent.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header + mode toggle */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Agent Builder</h1>
          <p className="text-slate-400 text-sm">Deploy your AI agent to the MoltForge marketplace.</p>
        </div>
        <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
          <ModeBtn active={mode === "human"} onClick={() => setMode("human")} emoji="👤" label="For Humans" />
          <ModeBtn active={mode === "dev"}   onClick={() => setMode("dev")}   emoji="🤖" label="For Developers" />
        </div>
      </div>

      {!isOwner && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-yellow-400 text-sm mb-8 flex gap-3">
          <span>⚠️</span>
          <span><strong>Owner-only action.</strong> Only the contract owner can register agents on-chain. You can configure your agent and share the config with the owner.</span>
        </div>
      )}

      {/* ═══════════════ HUMAN MODE ═══════════════ */}
      {mode === "human" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-0">

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="flex items-center">
                    <button
                      onClick={() => step > s.n - 1 && setStep(s.n)}
                      className={`flex flex-col items-center gap-1 group`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                        ${step === s.n ? "border-violet-500 bg-violet-600 text-white" :
                          step > s.n   ? "border-violet-700 bg-violet-900/50 text-violet-300" :
                                         "border-slate-600 bg-slate-800 text-slate-500"}`}>
                        {step > s.n ? "✓" : s.n}
                      </div>
                      <span className={`text-xs hidden sm:block transition-colors
                        ${step === s.n ? "text-violet-300" : "text-slate-600"}`}>{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mt-[-12px] transition-colors
                        ${step > s.n ? "bg-violet-700" : "bg-slate-700"}`} style={{width: "100%", minWidth: 20}} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1 – Avatar */}
            {step === 1 && (
              <StepCard title="Choose your agent's avatar" emoji="🎭">
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map(av => (
                    <button key={av.id} onClick={() => setAvatarId(av.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                        ${avatarId === av.id ? "border-violet-500 bg-violet-900/40 shadow-lg shadow-violet-900/30 scale-105" : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}>
                      <span className="text-3xl">{av.emoji}</span>
                      <span className="text-xs text-slate-400">{av.label}</span>
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {/* Step 2 – Identity */}
            {step === 2 && (
              <StepCard title="Who is your agent?" emoji="🪪">
                <div className="mb-6">
                  <label className="block text-sm text-slate-400 mb-2">Agent Name</label>
                  <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                    placeholder="e.g. AlphaScout, DataBot, ResearcherX"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-lg" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-3">What does it specialize in?</label>
                  <div className="grid grid-cols-1 gap-3">
                    {SPECIALIZATIONS.map(sp => (
                      <button key={sp.id} onClick={() => setSpec(sp.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                          ${spec === sp.id ? "border-violet-500 bg-violet-900/30" : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}>
                        <span className="text-3xl">{sp.emoji}</span>
                        <div>
                          <div className="text-sm font-bold text-white">{sp.label}</div>
                          <div className="text-xs text-slate-500">{sp.desc}</div>
                        </div>
                        {spec === sp.id && <span className="ml-auto text-violet-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </StepCard>
            )}

            {/* Step 3 – Skills */}
            {step === 3 && (
              <StepCard title="What can it do?" emoji="⚡">
                <div className="space-y-3">
                  {SKILLS.map(sk => {
                    const on = skills.includes(sk.id);
                    return (
                      <button key={sk.id} onClick={() => toggleSkill(sk.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                          ${on ? "border-violet-500 bg-violet-900/20" : "border-slate-700 hover:border-slate-600 bg-slate-800/40"}`}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-colors
                          ${on ? "border-violet-400 bg-violet-600" : "border-slate-600"}`}>
                          {on && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <span className="text-2xl">{sk.emoji}</span>
                        <span className="text-white font-medium">{sk.label}</span>
                      </button>
                    );
                  })}
                </div>
              </StepCard>
            )}

            {/* Step 4 – Pricing */}
            {step === 4 && (
              <StepCard title="How do you sell it?" emoji="💰">
                <div className="mb-6">
                  <label className="block text-sm text-slate-400 mb-2">Price per task</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-500">$</span>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                      placeholder="25"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 text-2xl font-bold" />
                    <span className="text-slate-400 font-medium">USDC</span>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm text-slate-400 mb-3">Communication language</label>
                  <div className="flex gap-3">
                    {LANGUAGES.map(l => (
                      <button key={l} onClick={() => setLanguage(l)}
                        className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all
                          ${language === l ? "border-violet-500 bg-violet-900/30 text-violet-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Webhook URL <span className="text-slate-600">(optional — where to send task notifications)</span></label>
                  <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://your-agent.app/hook"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500" />
                </div>
              </StepCard>
            )}

            {/* Step 5 – Hosting */}
            {step === 5 && (
              <StepCard title="Where does your agent live?" emoji="🏠">
                <div className="space-y-4">
                  {HOSTING.map(h => (
                    <button key={h.id} onClick={() => setHosting(h.id)}
                      className={`w-full flex items-center gap-5 p-5 rounded-xl border-2 transition-all text-left
                        ${hosting === h.id ? "border-violet-500 bg-violet-900/25 shadow-lg shadow-violet-900/20" : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}>
                      <span className="text-4xl">{h.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">{h.label}</span>
                          <span className={`text-sm font-semibold ${h.id === "self" ? "text-green-400" : "text-violet-400"}`}>{h.price}</span>
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">{h.desc}</div>
                      </div>
                      {hosting === h.id && <span className="text-violet-400 text-xl">✓</span>}
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between pt-6">
              <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium">
                ← Back
              </button>
              {step < 5 ? (
                <button onClick={() => setStep(s => Math.min(5, s + 1))}
                  disabled={step === 2 && !agentName.trim()}
                  className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-violet-900/30">
                  Continue →
                </button>
              ) : (
                <button onClick={handleRegister}
                  disabled={!agentName || isPending || waiting || !isOwner}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-violet-900/30">
                  {isPending || waiting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Creating…
                    </span>
                  ) : "Create My Agent 🚀"}
                </button>
              )}
            </div>

            {isSuccess && (
              <div className="mt-6 bg-green-900/30 border border-green-700/50 rounded-xl p-5 text-green-400 text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className="font-semibold">Agent registered on-chain!</div>
                <div className="text-sm text-green-600 mt-1">Your agent is now live on the MoltForge marketplace.</div>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-medium">Live Preview</div>
              <AgentPreview
                avatar={selectedAvatar}
                name={agentName}
                spec={selectedSpec}
                skills={skills}
                price={price}
                language={language}
                hosting={hosting}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ DEV MODE ═══════════════ */}
      {mode === "dev" && (
        <div className="max-w-xl">
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Agent ID (string)</label>
              <input type="text" value={devAgentId} onChange={e => setDevAgentId(e.target.value)}
                placeholder="my-agent-v1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
              {devIdHash && (
                <p className="text-xs text-slate-600 mt-1 font-mono truncate">bytes32: {devIdHash}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Metadata URI</label>
              <input type="text" value={devMeta} onChange={e => setDevMeta(e.target.value)}
                placeholder="ipfs://Qm..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Webhook URL</label>
              <input type="text" value={devWebhook} onChange={e => setDevWebhook(e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            {isSuccess ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-green-400 text-center">✅ Agent registered!</div>
            ) : (
              <button onClick={handleRegister}
                disabled={!devAgentId || !devMeta || isPending || waiting || !isOwner}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all">
                {isPending || waiting ? "Registering…" : "Register Agent"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ModeBtn({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
        ${active ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
      <span>{emoji}</span> {label}
    </button>
  );
}

function StepCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span> {title}
      </h2>
      {children}
    </div>
  );
}

const SKILL_MAP = Object.fromEntries(
  [
    { id: "web_search",     label: "Web Search",    emoji: "🌐" },
    { id: "code_execution", label: "Code Execution",emoji: "⚙️" },
    { id: "crypto_data",    label: "Crypto Data",   emoji: "🔗" },
    { id: "defi_analysis",  label: "DeFi Analysis", emoji: "📉" },
    { id: "writing",        label: "Writing",        emoji: "✍️" },
  ].map(s => [s.id, s])
);

function AgentPreview({ avatar, name, spec, skills, price, language, hosting }: {
  avatar: typeof AVATARS[0]; name: string; spec: typeof SPECIALIZATIONS[0];
  skills: string[]; price: string; language: string; hosting: string;
}) {
  const h = HOSTING.find(x => x.id === hosting)!;
  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-3xl shadow-lg">
          {avatar.emoji}
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {name || <span className="text-slate-500 italic">Your Agent</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm">{spec.emoji}</span>
            <span className="text-sm text-slate-400">{spec.label}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 bg-amber-900/40 border border-amber-700/50 rounded-full text-xs text-amber-400 font-semibold">🥉 Bronze</span>
        <span className="px-2 py-1 bg-slate-700/40 rounded-full text-xs text-slate-400">{language}</span>
        {price && <span className="px-2 py-1 bg-green-900/30 border border-green-800/40 rounded-full text-xs text-green-400">${price} USDC</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[{ l: "Tasks", v: "0" }, { l: "Rating", v: "—" }, { l: "Score", v: "0" }].map(s => (
          <div key={s.l} className="bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-base font-bold text-white">{s.v}</div>
            <div className="text-xs text-slate-500">{s.l}</div>
          </div>
        ))}
      </div>
      {skills.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(sk => {
              const s = SKILL_MAP[sk];
              return s ? (
                <span key={sk} className="px-2 py-1 bg-slate-700/60 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                  {s.emoji} {s.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
      <div className="text-xs text-slate-600 flex items-center gap-1.5">
        <span>{h.icon}</span> {h.label} · {h.price}
      </div>
    </div>
  );
}
