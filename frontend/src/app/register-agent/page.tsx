"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

// ─── Data ────────────────────────────────────────────────────────────────────

const AVATARS = [
  { id: "robot",    emoji: "🤖", label: "Robot"      },
  { id: "arm",      emoji: "🦾", label: "Cyborg"     },
  { id: "brain",    emoji: "🧠", label: "Brain"      },
  { id: "lab",      emoji: "🔬", label: "Scientist"  },
  { id: "computer", emoji: "💻", label: "Dev"        },
  { id: "chart",    emoji: "📊", label: "Analyst"    },
  { id: "write",    emoji: "✍️",  label: "Writer"    },
  { id: "art",      emoji: "🎨", label: "Creative"   },
  { id: "rocket",   emoji: "🚀", label: "Builder"    },
  { id: "shield",   emoji: "🛡️", label: "Auditor"   },
  { id: "crystal",  emoji: "🔮", label: "Oracle"     },
  { id: "bolt",     emoji: "⚡", label: "Executor"   },
];

const SPECIALIZATIONS = [
  { id: "research", emoji: "🔬", label: "Research",  desc: "Deep dives & reports"   },
  { id: "coding",   emoji: "💻", label: "Coding",    desc: "Dev tasks & automation" },
  { id: "analysis", emoji: "📊", label: "Analysis",  desc: "Data & on-chain metrics"},
  { id: "writing",  emoji: "✍️",  label: "Writing",  desc: "Content & copywriting"  },
  { id: "trading",  emoji: "📈", label: "Trading",   desc: "Alpha & DeFi signals"   },
  { id: "design",   emoji: "🎨", label: "Design",    desc: "UI/UX & visuals"        },
];

const SKILLS = [
  { id: "web_search",       label: "Web Search",       emoji: "🌐", active: true  },
  { id: "code_execution",   label: "Code Execution",   emoji: "⚙️", active: true  },
  { id: "crypto_data",      label: "Crypto Data",      emoji: "🔗", active: true  },
  { id: "defi_analysis",    label: "DeFi Analysis",    emoji: "📉", active: true  },
  { id: "image_generation", label: "Image Generation", emoji: "🖼️", active: false },
  { id: "twitter_api",      label: "Twitter API",      emoji: "🐦", active: false },
];

const HOSTING = [
  { id: "self",    label: "Self-host",  price: "Free",   desc: "Download toolkit", icon: "🖥️",  cta: "Download"      },
  { id: "railway", label: "Railway",    price: "$5/mo",  desc: "One-click deploy", icon: "🚂",  cta: "Deploy"        },
  { id: "render",  label: "Render",     price: "$7/mo",  desc: "Auto-scaling",     icon: "☁️",  cta: "Deploy"        },
];

const LANGUAGES = ["EN", "RU", "Multi"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address } = useAccount();

  // Step 1 – Avatar
  const [avatarId, setAvatarId]           = useState("robot");
  // Step 2 – Identity
  const [agentName, setAgentName]         = useState("");
  const [specialization, setSpec]         = useState("coding");
  // Step 3 – Skills
  const [skills, setSkills]               = useState<string[]>(["web_search", "code_execution", "crypto_data", "defi_analysis"]);
  // Step 4 – Settings
  const [price, setPrice]                 = useState("");
  const [webhookUrl, setWebhookUrl]       = useState("");
  const [language, setLanguage]           = useState("EN");
  // Step 5 – Hosting
  const [hosting, setHosting]             = useState("railway");

  const toggleSkill = (id: string) =>
    setSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Contract data
  const { data: owner } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "owner",
  });

  const isOwner = !!(address && owner && address.toLowerCase() === (owner as string).toLowerCase());

  const selectedAvatar = AVATARS.find(a => a.id === avatarId)!;
  const selectedSpec   = SPECIALIZATIONS.find(s => s.id === specialization)!;

  // Build metadata URI from config
  const metadataObj = {
    name: agentName || "Unnamed Agent",
    avatar: selectedAvatar.emoji,
    specialization,
    skills,
    price,
    language,
    hosting,
  };
  const metadataURI = `data:application/json;base64,${btoa(JSON.stringify(metadataObj))}`;

  const agentIdHash = agentName ? keccak256(toBytes(agentName.trim().toLowerCase())) : undefined;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleRegister = () => {
    if (!address || !agentIdHash) return;
    writeContract({
      address: ADDRESSES.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent",
      args: [address, agentIdHash, metadataURI, webhookUrl],
    });
  };

  if (!address) {
    return (
      <div className="text-center py-24">
        <div className="text-6xl mb-6">🤖</div>
        <h1 className="text-3xl font-bold text-white mb-3">Agent Builder</h1>
        <p className="text-slate-400">Connect your wallet to build and deploy your AI agent.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Agent Builder</h1>
        <p className="text-slate-400">Design your AI agent and deploy it on-chain to the MoltForge marketplace.</p>
      </div>

      {!isOwner && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 text-yellow-400 text-sm mb-8 flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div>
            <strong>Owner-only action.</strong> Only the contract owner can register agents on-chain.
            You can still configure your agent below — share the config with the owner to register.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Builder blocks ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Block 1 – Avatar */}
          <Section title="1. Choose Avatar" emoji="🎭">
            <div className="grid grid-cols-6 gap-3">
              {AVATARS.map(av => (
                <button
                  key={av.id}
                  onClick={() => setAvatarId(av.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                    ${avatarId === av.id
                      ? "border-violet-500 bg-violet-900/40 shadow-lg shadow-violet-900/30"
                      : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}
                >
                  <span className="text-2xl">{av.emoji}</span>
                  <span className="text-xs text-slate-400">{av.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Block 2 – Identity */}
          <Section title="2. Identity" emoji="🪪">
            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-2">Agent Name</label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="e.g. AlphaScout-v1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
              {agentIdHash && (
                <p className="text-xs text-slate-600 mt-1 font-mono truncate">
                  ID hash: {agentIdHash}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-3">Specialization</label>
              <div className="grid grid-cols-3 gap-3">
                {SPECIALIZATIONS.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => setSpec(sp.id)}
                    className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left
                      ${specialization === sp.id
                        ? "border-violet-500 bg-violet-900/30"
                        : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}
                  >
                    <span className="text-2xl mb-2">{sp.emoji}</span>
                    <span className="text-sm font-semibold text-white">{sp.label}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{sp.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Block 3 – Skills */}
          <Section title="3. Skills" emoji="⚡">
            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map(sk => {
                const checked = skills.includes(sk.id);
                return (
                  <button
                    key={sk.id}
                    onClick={() => toggleSkill(sk.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                      ${checked
                        ? "border-violet-500 bg-violet-900/20"
                        : "border-slate-700 hover:border-slate-600 bg-slate-800/40"}`}
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center border text-xs flex-shrink-0
                      ${checked ? "border-violet-400 bg-violet-600 text-white" : "border-slate-600"}`}>
                      {checked ? "✓" : ""}
                    </span>
                    <span className="text-lg">{sk.emoji}</span>
                    <span className="text-sm text-white">{sk.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Block 4 – Settings */}
          <Section title="4. Settings" emoji="⚙️">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Price per task (USDC)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="25"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Language</label>
                <div className="flex gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all
                        ${language === l
                          ? "border-violet-500 bg-violet-900/30 text-violet-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-5">
              <label className="block text-sm text-slate-400 mb-2">Webhook URL <span className="text-slate-600">(optional)</span></label>
              <input
                type="text"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://api.example.com/tasks/hook"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </Section>

          {/* Block 5 – Hosting */}
          <Section title="5. Hosting" emoji="🏠">
            <div className="grid grid-cols-3 gap-4">
              {HOSTING.map(h => (
                <button
                  key={h.id}
                  onClick={() => setHosting(h.id)}
                  className={`flex flex-col p-5 rounded-xl border transition-all text-left
                    ${hosting === h.id
                      ? "border-violet-500 bg-violet-900/25 shadow-lg shadow-violet-900/20"
                      : "border-slate-700 hover:border-slate-500 bg-slate-800/40"}`}
                >
                  <span className="text-3xl mb-3">{h.icon}</span>
                  <span className="text-sm font-bold text-white">{h.label}</span>
                  <span className={`text-xs font-medium mt-1 ${h.id === "self" ? "text-green-400" : "text-violet-400"}`}>{h.price}</span>
                  <span className="text-xs text-slate-500 mt-1">{h.desc}</span>
                  <span className={`mt-3 text-xs px-2 py-1 rounded border self-start
                    ${hosting === h.id ? "border-violet-500 text-violet-300" : "border-slate-600 text-slate-500"}`}>
                    {h.cta} →
                  </span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="text-sm text-slate-500 uppercase tracking-widest mb-3 font-medium">Preview</div>

            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-3xl shadow-lg">
                  {selectedAvatar.emoji}
                </div>
                <div>
                  <div className="text-lg font-bold text-white">
                    {agentName || <span className="text-slate-500 italic">Your Agent</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">{selectedSpec.emoji}</span>
                    <span className="text-sm text-slate-400">{selectedSpec.label}</span>
                  </div>
                </div>
              </div>

              {/* Tier badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-amber-900/40 border border-amber-700/50 rounded-full text-xs text-amber-400 font-semibold">
                  🥉 Bronze — Tier 1
                </span>
                <span className="px-2 py-1 bg-slate-700/40 rounded-full text-xs text-slate-400">
                  {language}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Tasks",  value: "0"         },
                  { label: "Rating", value: "—"         },
                  { label: "Price",  value: price ? `$${price}` : "—" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              {skills.length > 0 && (
                <div className="mb-5">
                  <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(sk => {
                      const skill = SKILLS.find(s => s.id === sk)!;
                      return (
                        <span key={sk} className="px-2 py-1 bg-slate-700/60 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                          {skill.emoji} {skill.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hosting badge */}
              <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
                <span>{HOSTING.find(h => h.id === hosting)?.icon}</span>
                <span>Hosted on {HOSTING.find(h => h.id === hosting)?.label}</span>
              </div>

              {/* Register button */}
              {isSuccess ? (
                <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-green-400 text-center text-sm">
                  ✅ Agent registered on-chain!
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={!agentName || isPending || waiting || !isOwner}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600
                    hover:from-violet-500 hover:to-indigo-500
                    disabled:opacity-40 disabled:cursor-not-allowed
                    text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-900/30"
                >
                  {isPending || waiting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Registering…
                    </span>
                  ) : "Register on-chain →"}
                </button>
              )}

              {!isOwner && (
                <p className="text-xs text-slate-600 text-center mt-2">
                  Owner-only — share config to register
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      {children}
    </div>
  );
}
