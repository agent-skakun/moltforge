"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { HumanoidFigure, AVATARS as HUMANOID_AVATARS } from "@/components/HumanoidFigure";
import { AvatarFace, PRESETS, SKIN_COLORS, FaceParams } from "@/components/AvatarFace";

// ─── Roll random avatar ────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rollRandomAvatar(): FaceParams {
  return {
    faceShape:  pick(["oval","round","square","heart","diamond","oblong"] as FaceParams["faceShape"][]),
    skinColor:  pick(SKIN_COLORS),
    aging:      pick(["none","none","none","light","heavy"] as FaceParams["aging"][]),
    freckles:   pick(["none","none","light","heavy"] as FaceParams["freckles"][]),
    scar:       pick(["none","none","none","cheek","chin","forehead"] as FaceParams["scar"][]),
    eyes:       pick(["normal","asian","wide","tired","hooded","deep","almond","round"] as FaceParams["eyes"][]),
    eyeColor:   pick(["brown","blue","green","gray","hazel","amber"] as FaceParams["eyeColor"][]),
    eyebrows:   pick(["normal","thick","thin","arched","straight","bushy"] as FaceParams["eyebrows"][]),
    nose:       pick(["small","medium","wide","upturned","hooked","button"] as FaceParams["nose"][]),
    mouth:      pick(["smile","neutral","serious","smirk","open","pouty"] as FaceParams["mouth"][]),
    ears:       pick(["normal","large","small","pointed"] as FaceParams["ears"][]),
    hair:       pick(["short","long","curly","bald","ponytail","afro","business","mohawk","undercut","buzz","bun","wavy","dreadlocks","braids","pixie","bob"] as FaceParams["hair"][]),
    hairColor:  pick(["black","brown","blonde","red","gray","white","platinum","auburn"] as FaceParams["hairColor"][]),
    highlights: Math.random() > 0.7,
    facialHair: pick(["none","none","none","stubble","short","full","goatee","mustache","viking","thick"] as FaceParams["facialHair"][]),
    makeup:     pick(["none","none","light","bold","goth","natural"] as FaceParams["makeup"][]),
    skinDetail: pick(["none","none","freckles","moles","wrinkles"] as FaceParams["skinDetail"][]),
    glasses:    pick(["none","none","none","round","square","oval","cat-eye","rimless"] as FaceParams["glasses"][]),
    glassesColor: pick(["#111","#555","#a0522d","#1db8a8","#f07828","#e8e8e8"]),
    piercing:   pick(["none","none","none","nose","lip","eyebrow","multiple"] as FaceParams["piercing"][]),
    tattoo:     pick(["none","none","none","neck","face","tear","tribal","circuit"] as FaceParams["tattoo"][]),
    necklace:   pick(["none","none","chain","pendant","choker","beads"] as FaceParams["necklace"][]),
    necklaceColor: pick(["#d4a853","#aaa","#e8e8e8","#1db8a8"]),
    earrings:   pick(["none","none","none","studs","hoops","drops","dangles","cuffs"] as FaceParams["earrings"][]),
    earringsColor: pick(["#d4a853","#aaa","#e8e8e8","#1db8a8","#f07828"]),
    hat:        pick(["none","none","none","cap","beanie","fedora","hood","crown","beret","hardhat"] as FaceParams["hat"][]),
    hatColor:   pick(["#222","#444","#1db8a8","#f07828","#8b5cf6","#e63030","#3ec95a"]),
  };
}
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

type Zone = "head" | "face" | "heart" | "hands" | "wallet" | "brain" | "deploy" | null;

interface SkillItem { id: string; label: string; desc: string; path: string; category: string }
interface SkillGroups { [category: string]: SkillItem[] }

const ZONE_META: Record<NonNullable<Zone>, { emoji: string; title: string; desc: string }> = {
  head:   { emoji: "🧠", title: "Knowledge",      desc: "Skills from moltforge-skills repo"  },
  face:   { emoji: "👁️", title: "Identity",       desc: "Avatar, name, tone"                 },
  heart:  { emoji: "❤️", title: "Specialization", desc: "Your agent's core focus"            },
  hands:  { emoji: "🤝", title: "Tools",          desc: "External APIs & integrations"       },
  wallet: { emoji: "💰", title: "Settings",       desc: "Pricing, hosting, webhook"          },
  brain:  { emoji: "🤖", title: "Brain",          desc: "LLM model & system prompt"         },
  deploy: { emoji: "🚀", title: "Deploy",         desc: "Hosting & deployment"              },
};

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function RegisterAgentPage() {
  const { address, isConnected } = useAccount();

  // Builder state
  const [avatarId, setAvatarId]       = useState("ai");
  const [faceParams, setFaceParams]   = useState<FaceParams>(PRESETS["ai"]);
  const [agentName, setAgentName]     = useState("");
  const [spec, setSpec]               = useState("coding");
  const [skills, setSkills]           = useState<string[]>([]);
  const [tools, setTools]             = useState<string[]>(["coingecko", "websearch"]);
  const [tone, setTone]               = useState("professional");
  const [language] = useState("EN");
  const [price, setPrice]             = useState("");
  const [hosting, setHosting]         = useState("railway");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [webhookOpen, setWebhookOpen] = useState(true);
  const [mcpUrl, setMcpUrl]           = useState("");
  const [mcpList, setMcpList]         = useState<string[]>([]);

  // Brain (LLM) state
  const [llmProvider, setLlmProvider] = useState("claude");
  const [llmModel, setLlmModel]       = useState("");
  const [llmApiKey, setLlmApiKey]     = useState("");
  const [showApiKey, setShowApiKey]   = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [showTgToken, setShowTgToken] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens]     = useState(2000);
  const [modelParamsOpen, setModelParamsOpen] = useState(false);

  // Deploy state
  const [deployMode, setDeployMode]   = useState<"hosted" | "self" | "existing">("hosted");
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [deployStep, setDeployStep]   = useState(0); // 0-3 animation step
  const [deployResult, setDeployResult] = useState<{ agentUrl: string; dashboardUrl: string; domain: string } | null>(null);
  const [deployError, setDeployError] = useState("");

  // "Connect Existing Agent" mode — agent already lives somewhere
  const [existingMetaURI, setExistingMetaURI] = useState("");

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
          const firstCat = Object.keys(data.groups)[0];
          if (firstCat) setExpandedCategories([firstCat]);
        }
      })
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, []);

  // Auto-fill system prompt when spec changes
  const DEFAULT_PROMPTS: Record<string, string> = {
    research:       "You are a research specialist AI agent. Your task is to find accurate, up-to-date information on any topic. Always cite sources, provide concise summaries, and highlight key insights.",
    coding:         "You are an expert software engineer AI agent. You write clean, tested, production-ready code. You explain your decisions and follow best practices.",
    trading:        "You are a trading and market analysis AI agent. You analyze price action, market sentiment, and on-chain data to identify opportunities. Always include risk disclaimers.",
    analytics:      "You are a data analytics AI agent. You process and interpret data, generate insights, create summaries, and identify trends and anomalies.",
    defi:           "You are a DeFi protocol specialist AI agent. You understand AMMs, lending protocols, yield strategies, and smart contract interactions on EVM chains.",
    infrastructure: "You are a DevOps and infrastructure AI agent. You manage deployments, monitor systems, optimize performance, and maintain reliability.",
    prediction:     "You are a prediction market AI agent. You analyze probabilities, evaluate evidence, and provide calibrated forecasts on future events.",
    ai:             "You are an AI systems specialist agent. You help design, evaluate, and integrate AI/ML pipelines, models, and infrastructure.",
    general:        "You are a capable AI agent ready to help with a wide range of tasks. You are helpful, accurate, and concise.",
  };

  // Generate dynamic prompt from name + spec + skills + tools
  const generatePrompt = (name: string, specialization: string, agentSkills: string[], agentTools: string[]) => {
    const base = DEFAULT_PROMPTS[specialization] ?? DEFAULT_PROMPTS["general"];
    const namePart = name ? `Your name is ${name}.` : "";
    const skillNames = agentSkills.map(s => s.split("/").pop()?.replace(".md","")).filter(Boolean);
    const skillsPart = skillNames.length > 0 ? `Your expertise includes: ${skillNames.join(", ")}.` : "";
    const toolsPart = agentTools.length > 0 ? `You have access to the following tools: ${agentTools.join(", ")}.` : "";
    return [namePart, base, skillsPart, toolsPart].filter(Boolean).join(" ");
  };

  useEffect(() => {
    setSystemPrompt(generatePrompt(agentName, spec, skills, tools));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, agentName, skills, tools]);

  // Sync config to reference-agent when skills/tools/spec change
  const AGENT_URL = deployResult?.agentUrl || webhookUrl || "";
  useEffect(() => {
    if (!agentName && !spec) return;
    const timer = setTimeout(() => {
      fetch(`${AGENT_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: agentName || "MoltForge Agent",
          specialization: spec,
          tone: tone || "professional",
          tools,
          skills,
        }),
      }).catch(() => {}); // silent — non-blocking
    }, 800); // debounce 800ms
    return () => clearTimeout(timer);
  }, [agentName, spec, tone, tools, skills]);

  // UI
  const [activeZone, setActiveZone]   = useState<Zone>(null);
  const [hoverZone, setHoverZone]     = useState<Zone>(null);
  // Contract
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Post-forge: read on-chain agent ID and URL
  const { data: onChainNumericId } = useReadContract({
    address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: address ? [address] : undefined,
    query: { enabled: isSuccess && !!address },
  });
  const numericId = onChainNumericId as bigint | undefined;

  const { data: extendedData } = useReadContract({
    address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentExtended",
    args: numericId && numericId > 0n ? [numericId] : undefined,
    query: { enabled: !!numericId && numericId > 0n },
  });
  const agentOnChainUrl = extendedData ? (extendedData as unknown as readonly unknown[])[4] as string : "";

  // A2A Card state
  const [a2aCardOpen, setA2aCardOpen]   = useState(false);
  const [a2aCardData, setA2aCardData]   = useState<object | null>(null);
  const [a2aLoading, setA2aLoading]     = useState(false);

  // After on-chain registration: save API key + avatar params to Supabase + trigger deploy
  useEffect(() => {
    if (!isSuccess) return;
    // Save API key to Supabase (server-side encrypted, AES-256-GCM)
    if (llmApiKey && address) {
      fetch("/api/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, apiKey: llmApiKey, llmProvider }),
      }).catch(() => { /* non-critical — localStorage is fallback */ });
    }
    // Save avatar params to Supabase (needed to render correct SVG on /agent/[id])
    if (address && agentIdHash) {
      const avatarHashHex = `0x${Buffer.from(
        agentIdHash.startsWith("0x") ? agentIdHash.slice(2) : agentIdHash, "hex"
      ).toString("hex")}`;
      // avatarHash is keccak256(faceParams JSON) — use agentIdHash as key
      const avatarHashKey = typeof window !== "undefined"
        ? btoa(unescape(encodeURIComponent(JSON.stringify(faceParams)))).slice(0, 16) + agentIdHash.slice(2, 10)
        : agentIdHash.slice(0, 24);
      fetch("/api/save-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarHash: agentIdHash, // keccak256 of agentName — unique per agent
          avatarParams: faceParams,
          walletAddress: address,
        }),
      }).catch(() => { /* non-critical */ });
      void avatarHashHex; void avatarHashKey; // suppress unused warnings
    }
    if (deployMode === "hosted" && deployStatus === "idle") {
      triggerRailwayDeploy(agentOnChainUrl || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const fetchA2aCard = async (url: string) => {
    setA2aLoading(true);
    try {
      const endpoint = (url || "").replace(/\/$/, "") + "/agent-card";
      const res = await fetch(endpoint);
      const data = await res.json();
      setA2aCardData(data);
      setA2aCardOpen(true);
    } catch {
      setA2aCardData({ error: "Could not fetch A2A card from " + url });
      setA2aCardOpen(true);
    } finally {
      setA2aLoading(false);
    }
  };

  // Test Agent state
  const [testQuery, setTestQuery]       = useState("Tell me about AI agent reputation systems on blockchain");
  const [testLoading, setTestLoading]   = useState(false);
  const [testResult, setTestResult]     = useState<string>("");
  const [testError, setTestError]       = useState<string>("");
  const [testModalOpen, setTestModalOpen] = useState(false);

  const runAgentTest = async (url: string) => {
    setTestLoading(true);
    setTestResult("");
    setTestError("");
    setTestModalOpen(true);
    try {
      const endpoint = url.replace(/\/$/, "") + "/tasks";
      // Pass user's LLM API key from localStorage (never stored on server)
      let apiKey: string | undefined;
      try {
        const storageKey = `mf_apikey_${agentName.trim().toLowerCase().replace(/\s+/g,"_")}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) apiKey = atob(stored);
      } catch { /* ignore */ }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: testQuery,
          ...(apiKey      && { apiKey }),
          ...(llmProvider && llmProvider !== "custom" && { llmProvider:
            llmProvider === "claude" ? "anthropic" :
            llmProvider === "gpt4o" || llmProvider === "gpt4omini" ? "openai" :
            llmProvider === "llama" ? "groq" : llmProvider
          }),
          systemPrompt: systemPrompt || undefined,
        }),
      });
      const data = await res.json();
      const report = data.report ?? data;
      const summary = report.summary ?? JSON.stringify(report, null, 2);
      const results = report.results ?? [];
      let out = `✅ ${summary}\n\n`;
      results.slice(0, 3).forEach((r: { title?: string; url?: string; snippet?: string }, i: number) => {
        out += `${i + 1}. ${r.title ?? ""}${r.url ? `\n   ${r.url}` : ""}${r.snippet ? `\n   ${r.snippet?.slice(0, 120)}` : ""}\n\n`;
      });
      setTestResult(out.trim());
    } catch (e) {
      setTestError("Agent unreachable: " + (e as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

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
    skills,
    tools,
    tone,
    language,
    price,
    hosting,
    webhookUrl,
    mcpList,
    llmProvider,
    llmModel: llmModel || (({ claude: "claude-3-5-sonnet-20241022", gpt4o: "gpt-4o", gpt4omini: "gpt-4o-mini", llama: "llama-3.3-70b-versatile", custom: "custom" } as Record<string,string>)[llmProvider] ?? llmProvider),
    temperature,
    maxTokens,
    systemPrompt: systemPrompt || (skills.length > 0
      ? `You have access to skill files in /skills/ directory. Skills loaded: ${skills.map(p => p.split('/').pop()?.replace('.md','')).join(', ')}.`
      : DEFAULT_PROMPTS[spec] ?? DEFAULT_PROMPTS["general"]),
    dockerEntrypoint: generateDockerEntrypoint() || undefined,
  };
  const metaURI = `data:application/json;base64,${typeof window !== "undefined" ? btoa(unescape(encodeURIComponent(JSON.stringify(metaObj)))) : ""}`;
  const agentIdHash = agentName ? keccak256(toBytes(agentName.trim().toLowerCase())) : undefined;
  const canDeploy = !!(agentName && spec && !isPending && !waiting && isConnected);

  const handleDeploy = () => {
    if (!address || !agentIdHash) return;
    // Save API key encrypted in localStorage (browser fallback)
    if (llmApiKey) {
      try {
        const storageKey = `mf_apikey_${agentName.trim().toLowerCase().replace(/\s+/g,'_')}`;
        localStorage.setItem(storageKey, btoa(llmApiKey));
      } catch { /* ignore */ }
    }

    if ((deployMode as string) === "existing") {
      // Path B: connect existing agent — minimal on-chain registration, no Railway
      const finalMetaURI = existingMetaURI.trim() || metaURI;
      writeContract({ address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
        functionName: "registerAgent",
        args: [address, agentIdHash, finalMetaURI, webhookUrl || ""] });
      return;
    }

    const avatarHashBytes32 = keccak256(toBytes(JSON.stringify(faceParams)));
    const skillPaths = skills.length > 0 ? skills : [];
    const toolIds = tools.length > 0 ? tools : [];
    // Use placeholder URL — will be updated after Railway deploy
    const placeholderUrl = deployMode === "self" ? (webhookUrl || "") : "";
    writeContract({ address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgentV2",
      args: [address, agentIdHash, metaURI, placeholderUrl, avatarHashBytes32, skillPaths, toolIds, placeholderUrl] });
  };

  // Auto-deploy to Railway after on-chain registration succeeds
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const triggerRailwayDeploy = async (_agentUrl?: string) => {
    if (deployMode !== "hosted") return;
    setDeployStatus("deploying");
    setDeployStep(0);
    setDeployError("");
    // Animate steps: Preparing(0) → Building(1) → Deploying(2) → Going Live(3)
    const stepDelays = [700, 1400, 2200];
    stepDelays.forEach((ms, i) => setTimeout(() => setDeployStep(i + 1), ms));
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          agentNumericId: numericId ? numericId.toString() : undefined,
          walletAddress: address,
          llmProvider,
          llmApiKey: llmApiKey || undefined,
          systemPrompt: systemPrompt || undefined,
          agentSkills: skills.join(",") || undefined,
          agentTools: tools.join(",") || undefined,
          agentSpecialization: spec,
          telegramBotToken: telegramBotToken || undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; agentUrl?: string; dashboardUrl?: string; domain?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Deploy failed");
      setDeployStep(4); // all done
      setDeployResult({ agentUrl: data.agentUrl!, dashboardUrl: data.dashboardUrl!, domain: data.domain! });
      setDeployStatus("done");
    } catch (e) {
      setDeployError((e as Error).message);
      setDeployStatus("error");
    }
  };

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  // Wallet gate removed — form always visible. Wallet needed only for tx.
  return (
    <div className="min-h-screen" style={{ background: "#060c0b", paddingTop: 0 }}>
      {/* Page title */}
      <div className="text-center pt-8 pb-6">
        <h1 className="text-3xl font-bold text-forge-white mb-1" style={{ fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.05em" }}>
          {(deployMode as string) === "existing" ? "Connect Existing Agent" : "Agent Builder"}
        </h1>
        <p className="text-forge-white/40 text-sm">
          {(deployMode as string) === "existing"
            ? "Register your agent as a MoltForge reputation layer — no deployment needed"
            : "Click on any body part to customize · Changes appear live"}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={() => setDeployMode("hosted")}
          style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: deployMode === "hosted" ? "#F97316" : "transparent",
            color: deployMode === "hosted" ? "#000" : "#94A3B8",
            border: deployMode === "hosted" ? "1px solid #F97316" : "1px solid #334155",
            transition: "all 0.2s"
          }}
        >
          🛠 Create New Agent
        </button>
        <button
          onClick={() => setDeployMode("existing")}
          style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: deployMode === "existing" ? "#22C55E" : "transparent",
            color: deployMode === "existing" ? "#000" : "#94A3B8",
            border: deployMode === "existing" ? "1px solid #22C55E" : "1px solid #334155",
            transition: "all 0.2s"
          }}
        >
          🔗 Connect Existing Agent
        </button>
      </div>

      {deployMode !== "existing" && (
      <div className="flex items-start justify-center gap-0 relative max-w-6xl mx-auto px-6" style={{ overflowX: "visible" }}>

        {/* ── CENTER: Agent Figure ── */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 320, overflow: "visible", transition: "transform 0.3s ease", transform: activeZone ? "translateX(-16px)" : "translateX(0)" }}>
          {/* Agent name above figure */}
          <div className="mb-2 text-center min-h-[2rem]">
            <span className="text-xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)", color: selectedSpec.color, letterSpacing: "-0.04em", textShadow: `0 0 20px ${selectedSpec.color}60` }}>
              {agentName || "Your Agent"}
            </span>
          </div>

          {/* 🎲 Roll button */}
          <div className="mb-3">
            <button
              onClick={() => { setFaceParams(rollRandomAvatar()); setAvatarId("custom"); }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg,#1db8a820,#f0782820)", border: "1px solid #f07828aa", color: "#f07828", fontFamily: "var(--font-space-grotesk)" }}
              title="Randomize avatar">
              🎲 Roll
            </button>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ background: activeZone === z ? "#1db8a822" : "#0a1a17", border: `1px solid ${activeZone === z ? "#1db8a8" : "#1a2e2b"}`, color: activeZone === z ? "#1db8a8" : "#6b8f8a" }}>
                {ZONE_META[z!]!.emoji} {ZONE_META[z!]!.title}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Panel ── */}
        <div style={{ width: activeZone ? 380 : 0, minWidth: activeZone ? 320 : 0, maxWidth: 420, flexShrink: 0, transition: "width 0.3s ease, min-width 0.3s ease", overflow: "hidden", position: "sticky", top: 72, alignSelf: "flex-start" }}>
          {!activeZone ? (
            <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: "#1a2e2b", minHeight: 400 }}>
              <div className="text-6xl mb-4 opacity-30">👈</div>
              <p className="text-forge-white/20 text-sm">Click on a body part<br/>to start customizing</p>
            </div>
          ) : (
            <div className="rounded-2xl p-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b", minHeight: 400, overflow: "hidden" }}>
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
                              emoji={CATEGORY_ICONS[cat] || "📄"} label={sk.label} desc={sk.desc} />
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
                <div className="space-y-5 overflow-y-auto no-scrollbar" style={{maxHeight:"calc(100vh - 220px)", paddingRight:4} as React.CSSProperties}>

                  {/* Preset quick-select */}
                  <div>
                    <SectionLabel>Choose Identity</SectionLabel>
                    <div className="flex flex-wrap gap-3">
                      {HUMANOID_AVATARS.map(av => (
                        <button key={av.id}
                          onClick={() => { setAvatarId(av.id); setFaceParams({...PRESETS[av.id]}); }}
                          className="flex flex-col items-center gap-1 transition-all"
                          style={{ minWidth: 52 }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            border: `2.5px solid ${avatarId === av.id ? "#1db8a8" : "#1a2e2b"}`,
                            background: "#060c0b",
                            boxShadow: avatarId === av.id ? "0 0 14px #1db8a870" : "none",
                            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}>
                            <AvatarFace params={PRESETS[av.id] || PRESETS["ai"]} size={52} />
                          </div>
                          <span style={{
                            fontSize: "0.6rem", fontFamily: "var(--font-jetbrains-mono)",
                            color: avatarId === av.id ? "#1db8a8" : "#5a807a",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                          }}>{av.label}</span>
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
                      Agent URL <span className="font-jetbrainsMono text-xs" style={{ color: "#1db8a8" }}>(required for Hire flow)</span>
                    </button>
                    {webhookOpen && (
                      <>
                        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                          placeholder="https://your-agent.up.railway.app"
                          className="w-full mt-2 px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                          style={{ background: "#060c0b", border: "1px solid #1db8a8", fontFamily: "var(--font-jetbrains-mono)" }} />
                        <p className="mt-1.5 text-xs" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)", lineHeight: 1.5 }}>
                          Your agent&apos;s HTTP endpoint that receives tasks. Example: <span style={{ color: "#1db8a8" }}>https://my-agent.railway.app</span> — must respond to <span style={{ color: "#1db8a8" }}>POST /tasks</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── BRAIN panel ── */}
              {activeZone === "brain" && (
                <div className="space-y-5">
                  <div>
                    <SectionLabel>LLM Provider</SectionLabel>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "claude",    label: "Claude",      sub: "Anthropic", emoji: "🟣", color: "#a855f7" },
                        { id: "gpt4o",     label: "GPT-4o",      sub: "OpenAI",    emoji: "🟢", color: "#22c55e" },
                        { id: "gpt4omini", label: "GPT-4o Mini", sub: "OpenAI",    emoji: "🟢", color: "#86efac" },
                        { id: "llama",     label: "Llama 3.3",   sub: "Groq",      emoji: "🟡", color: "#eab308" },
                        { id: "grok",      label: "Grok 3",      sub: "xAI",       emoji: "⚫", color: "#6b7280" },
                        { id: "gemini",    label: "Gemini",      sub: "Google",    emoji: "🔵", color: "#3b82f6" },
                        { id: "custom",    label: "Custom",      sub: "OpenAI-compatible", emoji: "⚙️", color: "#6b7280" },
                      ].map(p => (
                        <button key={p.id} onClick={() => { setLlmProvider(p.id); setLlmModel(""); }}
                          className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                          style={{ background: llmProvider === p.id ? `${p.color}15` : "#060c0b",
                            border: `1px solid ${llmProvider === p.id ? p.color : "#1a2e2b"}`,
                            boxShadow: llmProvider === p.id ? `0 0 12px ${p.color}20` : "none" }}>
                          <span className="text-xl">{p.emoji}</span>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-forge-white">{p.label}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>{p.sub}</div>
                          </div>
                          {llmProvider === p.id && <span className="text-xs" style={{ color: p.color }}>✓</span>}
                        </button>
                      ))}
                    </div>

                    {/* Model selector */}
                    {llmProvider && llmProvider !== "custom" && (() => {
                      const MODELS: Record<string, { id: string; label: string }[]> = {
                        claude:    [
                          { id: "claude-opus-4",              label: "Claude Opus 4" },
                          { id: "claude-sonnet-4",            label: "Claude Sonnet 4" },
                          { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
                          { id: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku" },
                        ],
                        gpt4o:     [{ id: "gpt-4o",   label: "GPT-4o" }, { id: "o3", label: "o3" }],
                        gpt4omini: [{ id: "gpt-4o-mini", label: "GPT-4o Mini" }, { id: "o4-mini", label: "o4-mini" }],
                        llama:     [{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }, { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" }],
                        grok:      [{ id: "grok-3", label: "Grok 3" }, { id: "grok-3-mini", label: "Grok 3 Mini" }],
                        gemini:    [{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }, { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" }],
                      };
                      const models = MODELS[llmProvider] ?? [];
                      if (!models.length) return null;
                      return (
                        <div className="mt-3">
                          <SectionLabel>Model</SectionLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {models.map(m => (
                              <button key={m.id} onClick={() => setLlmModel(m.id)}
                                className="px-3 py-2 rounded-xl text-xs text-left transition-all"
                                style={{ background: llmModel === m.id ? "#1db8a815" : "#060c0b",
                                  border: `1px solid ${llmModel === m.id ? "#1db8a8" : "#1a2e2b"}`,
                                  color: llmModel === m.id ? "#1db8a8" : "#5a807a" }}>
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <SectionLabel>Your API Key</SectionLabel>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={llmApiKey}
                        onChange={e => setLlmApiKey(e.target.value)}
                        placeholder={
                          llmProvider === "claude"    ? "sk-ant-..." :
                          llmProvider === "llama"     ? "gsk_..." :
                          "sk-..."
                        }
                        className="w-full px-4 py-3 pr-12 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                        style={{ background: "#060c0b", border: `1px solid ${llmApiKey ? "#1db8a840" : "#1a2e2b"}`, fontFamily: "var(--font-jetbrains-mono)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
                        style={{ color: "#3a5550", background: "transparent" }}
                        title={showApiKey ? "Hide" : "Show"}>
                        {showApiKey ? "🙈" : "👁"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs" style={{ color: "#3a5550" }}>
                        🔒 Never stored on our servers. Used only when your agent runs tasks.
                      </p>
                      <a
                        href={
                          llmProvider === "claude"               ? "https://console.anthropic.com" :
                          llmProvider === "gpt4o" || llmProvider === "gpt4omini" ? "https://platform.openai.com/api-keys" :
                          llmProvider === "llama"                ? "https://console.groq.com" :
                          "https://platform.openai.com/api-keys"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs whitespace-nowrap ml-3 flex-shrink-0"
                        style={{ color: "#1db8a8" }}>
                        Get a free key →
                      </a>
                    </div>
                  </div>

                  {/* Telegram Bot Token */}
                  <div>
                    <SectionLabel>Telegram Bot Token <span style={{ color: "#3a5550", fontWeight: 400 }}>(optional)</span></SectionLabel>
                    <div className="relative">
                      <input
                        type={showTgToken ? "text" : "password"}
                        value={telegramBotToken}
                        onChange={e => setTelegramBotToken(e.target.value)}
                        placeholder="1234567890:ABCDef..."
                        className="w-full px-4 py-3 pr-12 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                        style={{ background: "#060c0b", border: `1px solid ${telegramBotToken ? "#a855f740" : "#1a2e2b"}`, fontFamily: "var(--font-jetbrains-mono)" }}
                      />
                      <button type="button" onClick={() => setShowTgToken(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                        style={{ color: "#3a5550", background: "transparent" }}>
                        {showTgToken ? "🙈" : "👁"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs" style={{ color: "#3a5550" }}>
                        🤖 Your agent will be reachable via Telegram bot
                      </p>
                      <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                        className="text-xs whitespace-nowrap ml-3"
                        style={{ color: "#1db8a8" }}>
                        Create bot →
                      </a>
                    </div>
                  </div>

                  <div>
                    <SectionLabel>System Prompt</SectionLabel>
                    <textarea
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      rows={5}
                      placeholder="You are a helpful AI agent specialized in..."
                      className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm resize-none"
                      style={{ background: "#060c0b", border: "1px solid #1a2e2b", fontFamily: "var(--font-jetbrains-mono)" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "#3a5550" }}>
                      Auto-generated from your name, specialization, skills and tools. Edit as needed.
                    </p>
                  </div>

                  <div>
                    <button onClick={() => setModelParamsOpen(o => !o)}
                      className="flex items-center gap-2 text-sm transition-colors"
                      style={{ color: modelParamsOpen ? "#1db8a8" : "#3a5550" }}>
                      <span style={{ transform: modelParamsOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
                      Model Parameters
                    </button>
                    {modelParamsOpen && (
                      <div className="mt-3 space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-2" style={{ color: "#5a807a" }}>
                            <span>Temperature</span>
                            <span style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>{temperature.toFixed(1)}</span>
                          </div>
                          <input type="range" min={0} max={1} step={0.1} value={temperature}
                            onChange={e => setTemperature(Number(e.target.value))}
                            className="w-full accent-teal-500"
                          />
                          <div className="flex justify-between text-xs mt-0.5" style={{ color: "#1a2e2b" }}>
                            <span>Precise</span><span>Creative</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs mb-2" style={{ color: "#5a807a" }}>Max Tokens</div>
                          <input type="number" value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))}
                            min={256} max={8000} step={256}
                            className="w-full px-4 py-2 rounded-xl text-sm"
                            style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DEPLOY panel ── */}
              {activeZone === "deploy" && (
                <div className="space-y-5">
                  <div>
                    <SectionLabel>Deployment Mode</SectionLabel>
                    <div className="space-y-3">
                      <button onClick={() => { setDeployMode("hosted"); setWebhookUrl(""); }}
                        className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                        style={{ background: deployMode === "hosted" ? "#1db8a815" : "#060c0b",
                          border: `1px solid ${deployMode === "hosted" ? "#1db8a8" : "#1a2e2b"}` }}>
                        <span className="text-2xl mt-0.5">🚂</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-forge-white">MoltForge Hosted</div>
                          <div className="text-xs mt-1" style={{ color: "#5a807a" }}>Auto-deploy on Railway · Zero config</div>
                          <div className="text-xs mt-1" style={{ color: "#3a5550" }}>
                            Your agent will be deployed automatically after registration
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#1db8a815", border: "1px solid #1db8a830", color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                              ~$5/mo Railway Starter
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#f0782815", border: "1px solid #f0782830", color: "#f07828" }}>
                              Powered by Railway
                            </span>
                          </div>
                        </div>
                        {deployMode === "hosted" && <span className="text-sm" style={{ color: "#1db8a8" }}>✓</span>}
                      </button>

                      <button onClick={() => setDeployMode("self")}
                        className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                        style={{ background: deployMode === "self" ? "#3ec95a15" : "#060c0b",
                          border: `1px solid ${deployMode === "self" ? "#3ec95a" : "#1a2e2b"}` }}>
                        <span className="text-2xl mt-0.5">🛠️</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-forge-white">Self-hosted</div>
                          <div className="text-xs mt-1" style={{ color: "#5a807a" }}>Your own server · Full control</div>
                          <div className="text-xs mt-2 space-y-0.5" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                            <div>Required: POST /tasks</div>
                            <div>Required: GET /health</div>
                          </div>
                        </div>
                        {deployMode === "self" && <span className="text-sm" style={{ color: "#3ec95a" }}>✓</span>}
                      </button>

                      <button onClick={() => setDeployMode("existing" as "hosted" | "self" | "existing")}
                        className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                        style={{ background: (deployMode as string) === "existing" ? "#a855f715" : "#060c0b",
                          border: `1px solid ${(deployMode as string) === "existing" ? "#a855f7" : "#1a2e2b"}` }}>
                        <span className="text-2xl mt-0.5">🔌</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-forge-white">Connect Existing Agent</div>
                          <div className="text-xs mt-1" style={{ color: "#5a807a" }}>Agent already running · Just register here as reputation layer</div>
                          <div className="text-xs mt-2 space-y-0.5" style={{ color: "#3a5550" }}>
                            MoltForge is an open registry — any agent can join
                          </div>
                        </div>
                        {(deployMode as string) === "existing" && <span className="text-sm" style={{ color: "#a855f7" }}>✓</span>}
                      </button>
                    </div>
                  </div>

                  {deployMode === "self" && (
                    <div>
                      <SectionLabel>Agent URL</SectionLabel>
                      <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://your-agent.example.com"
                        className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                        style={{ background: "#060c0b", border: "1px solid #3ec95a", fontFamily: "var(--font-jetbrains-mono)" }}
                      />
                    </div>
                  )}

                  {(deployMode as string) === "existing" && (
                    <div className="space-y-4">
                      <div className="px-4 py-3 rounded-xl" style={{ background: "#a855f708", border: "1px solid #a855f730" }}>
                        <p className="text-xs" style={{ color: "#a855f7" }}>
                          🔌 <strong>Open Registry Mode</strong> — MoltForge acts as a reputation layer only.
                          Your agent runs independently. No Railway deployment. Just connect wallet → register → done.
                        </p>
                      </div>
                      <div>
                        <SectionLabel>Agent Webhook URL</SectionLabel>
                        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                          placeholder="https://your-existing-agent.com"
                          className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                          style={{ background: "#060c0b", border: "1px solid #a855f760", fontFamily: "var(--font-jetbrains-mono)" }}
                        />
                      </div>
                      <div>
                        <SectionLabel>Metadata URI <span style={{ color: "#5a807a", fontSize: "0.7rem" }}>(optional — IPFS CID or https://)</span></SectionLabel>
                        <input value={existingMetaURI} onChange={e => setExistingMetaURI(e.target.value)}
                          placeholder="ipfs://bafybeig... or https://your-agent.com/metadata.json"
                          className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
                          style={{ background: "#060c0b", border: "1px solid #a855f760", fontFamily: "var(--font-jetbrains-mono)" }}
                        />
                        <p className="text-xs mt-1.5" style={{ color: "#3a5550" }}>
                          JSON with: name, description, agentUrl, llmProvider, skills[], capabilities[]
                        </p>
                      </div>
                    </div>
                  )}

                  {deployMode === "hosted" && (
                    <div className="px-4 py-3 rounded-xl" style={{ background: "#0a1a17", border: "1px solid #1db8a820" }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                        ⚡ MoltForge Hosted — Auto-deploy
                      </div>
                      <div className="text-xs space-y-1" style={{ color: "#3a5550" }}>
                        <div>1. Submit form → agent registers on-chain</div>
                        <div>2. Platform deploys your agent to Railway automatically</div>
                        <div>3. You get a unique URL: <span style={{ color: "#5a807a" }}>mf-agent-[id].up.railway.app</span></div>
                        <div>4. URL recorded on-chain — no external accounts needed</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )} {/* end deployMode !== "existing" */}

      {/* ── Existing Agent: compact form ── */}
      {(deployMode as string) === "existing" && (
        <div className="max-w-xl mx-auto px-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Agent Name</label>
            <input value={agentName} onChange={e => setAgentName(e.target.value)}
              placeholder="BALABOLIK"
              className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
              style={{ background: "#060c0b", border: "1px solid #a855f760", fontFamily: "var(--font-jetbrains-mono)" }}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Webhook URL</label>
            <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://your-existing-agent.com"
              className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
              style={{ background: "#060c0b", border: "1px solid #a855f760", fontFamily: "var(--font-jetbrains-mono)" }}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
              Metadata URI <span style={{ color: "#5a807a", fontSize: "0.7rem", textTransform: "none" }}>(ipfs:// or https://)</span>
            </label>
            <input value={existingMetaURI} onChange={e => setExistingMetaURI(e.target.value)}
              placeholder="ipfs://bafybeig... or https://your-agent.com/metadata.json"
              className="w-full px-4 py-3 rounded-xl text-forge-white placeholder-forge-white/20 outline-none text-sm"
              style={{ background: "#060c0b", border: "1px solid #a855f760", fontFamily: "var(--font-jetbrains-mono)" }}
            />
            <p className="text-xs mt-1.5" style={{ color: "#3a5550" }}>
              JSON: name, description, agentUrl, llmProvider, skills[], capabilities[]
            </p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Specialization</label>
            <div className="flex flex-wrap gap-2">
              {["research","coding","trading","analytics","defi","infrastructure","prediction","ai"].map(s => (
                <button key={s} onClick={() => setSpec(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: spec === s ? "#a855f720" : "#060c0b",
                    border: `1px solid ${spec === s ? "#a855f7" : "#1a2e2b"}`,
                    color: spec === s ? "#a855f7" : "#5a807a" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom: Deploy button + post-deploy instructions ── */}
      <div className="flex justify-center mt-12 pb-16">
        {isSuccess ? (
          <div className="max-w-2xl w-full space-y-5">
            {/* Success banner */}
            <div className="px-8 py-4 rounded-2xl text-base font-semibold text-center" style={{ background: "#3ec95a20", border: "1px solid #3ec95a", color: "#3ec95a" }}>
              🎉 Agent deployed on-chain!
            </div>

            {/* On-chain ID + Agent URL */}
            <div className="px-6 py-4 rounded-xl space-y-3" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
              <div>
                <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>On-Chain Agent ID</div>
                <div className="text-sm font-bold" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#f07828" }}>
                  {numericId && numericId > 0n ? `#${numericId.toString()}` : "Loading…"}
                </div>
                {agentIdHash && (
                  <div className="text-xs mt-1 break-all" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#3a5550" }}>{agentIdHash}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>Agent URL</div>
                <div className="text-xs break-all" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#5a807a" }}>
                  {deployResult?.agentUrl || agentOnChainUrl || webhookUrl || "https://agent.moltforge.cloud"}
                </div>
              </div>
            </div>

            {/* ── Deploy Progress / Result ── */}
            {deployMode === "hosted" && (
              <div className="px-6 py-5 rounded-xl" style={{ background: "#0a1a17", border: `1px solid ${deployStatus === "done" ? "#3ec95a40" : deployStatus === "error" ? "#e6303040" : "#1a2e2b"}` }}>
                {/* Steps */}
                {(deployStatus === "deploying" || deployStatus === "done") && (() => {
                  const STEPS = [
                    { label: "Preparing environment",    icon: "⚙️" },
                    { label: "Building agent container", icon: "📦" },
                    { label: "Deploying to Railway",     icon: "🚂" },
                    { label: "Going live",               icon: "🌐" },
                  ];
                  const current = deployStatus === "done" ? 4 : deployStep;
                  return (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>
                        {deployStatus === "done" ? "✅ Agent is live!" : "🚀 Deploying your agent…"}
                      </div>
                      {STEPS.map((step, i) => {
                        const done    = i < current;
                        const active  = i === current && deployStatus === "deploying";
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs transition-all"
                              style={{
                                background: done ? "#3ec95a20" : active ? "#1db8a820" : "#0a1a17",
                                border: `1px solid ${done ? "#3ec95a" : active ? "#1db8a8" : "#1a2e2b"}`,
                              }}>
                              {done ? "✓" : active ? (
                                <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin block"
                                  style={{ borderColor: "#1db8a8", borderTopColor: "transparent" }} />
                              ) : step.icon}
                            </div>
                            <span className="text-xs transition-all"
                              style={{ color: done ? "#3ec95a" : active ? "#e8f5f3" : "#2a4a45" }}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                      {/* Progress bar */}
                      <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "#1a2e2b" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(current / 4) * 100}%`, background: deployStatus === "done" ? "#3ec95a" : "#1db8a8" }} />
                      </div>
                      {/* Agent URL after done */}
                      {deployStatus === "done" && deployResult && (
                        <div className="mt-4 space-y-3">
                          <div className="px-3 py-2 rounded-lg" style={{ background: "#060c0b", border: "1px solid #3ec95a30" }}>
                            <div className="text-xs mb-1" style={{ color: "#3a5550" }}>Agent URL</div>
                            <a href={deployResult.agentUrl} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-mono break-all"
                              style={{ color: "#1db8a8" }}>{deployResult.agentUrl}</a>
                          </div>
                          <div className="flex gap-2">
                            <a href={deployResult.agentUrl + "/health"} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs"
                              style={{ background: "#1db8a815", border: "1px solid #1db8a840", color: "#1db8a8" }}>
                              /health ↗
                            </a>
                            <a href={deployResult.agentUrl + "/agent.json"} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg text-xs"
                              style={{ background: "#f0782815", border: "1px solid #f0782840", color: "#f07828" }}>
                              /agent.json ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {deployStatus === "error" && (
                  <div>
                    <div className="text-xs mb-3" style={{ color: "#e63030" }}>❌ Deploy failed: {deployError}</div>
                    <button onClick={() => triggerRailwayDeploy(agentOnChainUrl || "")}
                      className="px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "#e6303015", border: "1px solid #e6303040", color: "#e63030" }}>
                      Retry
                    </button>
                  </div>
                )}
                {deployStatus === "idle" && (
                  <p className="text-xs" style={{ color: "#3a5550" }}>Waiting for on-chain confirmation…</p>
                )}
              </div>
            )}

            {/* Test Agent — button that opens modal */}
            <div className="px-6 py-4 rounded-xl" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
              <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>🧪 Test Your Agent</div>
              <div className="flex gap-3 items-center">
                <input
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  placeholder="Enter a task query for your agent…"
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
                />
                <button
                  onClick={() => runAgentTest(agentOnChainUrl || webhookUrl || "https://agent.moltforge.cloud")}
                  disabled={testLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                  style={{ background: testLoading ? "#0a1a17" : "#f0782822", border: `1px solid ${testLoading ? "#1a2e2b" : "#f07828"}`, color: testLoading ? "#3a5550" : "#f07828", cursor: testLoading ? "wait" : "pointer" }}>
                  {testLoading ? "⏳ Running…" : "▶ Run Task"}
                </button>
              </div>
            </div>

            {/* Deploy on Railway + A2A Card */}
            <div className="flex gap-3">
              <a href="https://railway.app/new?template=github" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#1db8a822", border: "1px solid #1db8a8", color: "#1db8a8" }}>
                🚂 Deploy on Railway
              </a>
              {txHash && (
                <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>
                  🔗 BaseScan
                </a>
              )}
            </div>

            {/* A2A Card */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2e2b" }}>
              <button
                onClick={() => a2aCardData ? setA2aCardOpen(o => !o) : fetchA2aCard(agentOnChainUrl || webhookUrl || "https://agent.moltforge.cloud")}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold transition-all"
                style={{ background: "#0a1a17", color: "#1db8a8" }}>
                <span>📋 {a2aCardData ? (a2aCardOpen ? "Hide" : "View") : "View"} A2A Card (ERC-8004)</span>
                <span style={{ fontSize: "0.7rem", color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {a2aLoading ? "Loading…" : a2aCardOpen ? "▲ collapse" : "▼ expand"}
                </span>
              </button>
              {a2aCardOpen && a2aCardData && (
                <div style={{ background: "#060c0b", borderTop: "1px solid #1a2e2b" }}>
                  <div className="flex justify-between items-center px-4 py-2" style={{ borderBottom: "1px solid #1a2e2b10" }}>
                    <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                      {(agentOnChainUrl || "https://agent.moltforge.cloud")}/agent-card
                    </span>
                    <a href={`${(agentOnChainUrl || "https://agent.moltforge.cloud").replace(/\/$/, "")}/agent-card`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                      ↗ open
                    </a>
                  </div>
                  <pre className="px-4 py-3 text-xs overflow-x-auto whitespace-pre-wrap break-words no-scrollbar"
                    style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#5a807a", maxHeight: 320, overflowY: "auto" }}>
                    {JSON.stringify(a2aCardData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Docker run command */}
            <div className="px-6 py-4 rounded-xl" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
              <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#1db8a8" }}>Self-Host (Docker)</div>
              <pre className="text-xs overflow-x-auto whitespace-pre" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#5a807a" }}>{
`docker run -d -p 3000:3000 \\
  -e WALLET_ADDRESS=${address ?? "<your-wallet>"} \\
  -e REGISTRY_ADDRESS=0x68C2390146C795879758F2a71a62fd114cd1E88d \\
  -e ESCROW_ADDRESS=0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4 \\
  -e RPC_URL=https://mainnet.base.org \\
  -e AGENT_NAME=${agentName || "<agent-name>"} \\
  ghcr.io/agent-skakun/moltforge-agent:latest`
              }</pre>
              <button
                onClick={() => { const cmd = `docker run -d -p 3000:3000 \\\n  -e WALLET_ADDRESS=${address ?? "<your-wallet>"} \\\n  -e REGISTRY_ADDRESS=0x68C2390146C795879758F2a71a62fd114cd1E88d \\\n  -e ESCROW_ADDRESS=0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4 \\\n  -e RPC_URL=https://mainnet.base.org \\\n  -e AGENT_NAME=${agentName || "<agent-name>"} \\\n  ghcr.io/agent-skakun/moltforge-agent:latest`; navigator.clipboard.writeText(cmd); }}
                className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "#1db8a815", border: "1px solid #1db8a840", color: "#1db8a8" }}>
                Copy
              </button>
            </div>
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
              <><span>{(deployMode as string) === "existing" ? "🔌" : "⚡"}</span> {(deployMode as string) === "existing" ? "Register On-Chain" : "Deploy Agent"} {!agentName && <span className="text-sm font-normal opacity-60 ml-1">— enter a name first</span>}</>
            )}
          </button>
        )}
      </div>

      {/* ── Test Agent Modal ── */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setTestModalOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: "#0a1a17", border: "1px solid #1db8a840", boxShadow: "0 0 60px #1db8a820" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid #1a2e2b" }}>
              <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3" }}>
                🧪 Agent Response
              </div>
              <button onClick={() => setTestModalOpen(false)}
                className="text-xs px-2 py-1 rounded"
                style={{ color: "#3a5550", background: "#060c0b", border: "1px solid #1a2e2b" }}>
                ✕ Close
              </button>
            </div>
            {/* Modal body */}
            <div className="px-6 py-5">
              <div className="text-xs mb-3" style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#3a5550" }}>
                Query: <span style={{ color: "#5a807a" }}>{testQuery}</span>
              </div>
              {testLoading ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1db8a8", borderTopColor: "transparent" }} />
                  <span className="text-sm" style={{ color: "#5a807a" }}>Agent is processing…</span>
                </div>
              ) : testError ? (
                <div className="p-4 rounded-xl text-sm" style={{ background: "#1a0808", border: "1px solid #e6303040", color: "#e63030" }}>
                  {testError}
                </div>
              ) : testResult ? (
                <pre className="p-4 rounded-xl text-xs whitespace-pre-wrap break-words"
                  style={{ background: "#060c0b", border: "1px solid #1db8a820", color: "#5a807a",
                    fontFamily: "var(--font-jetbrains-mono)", maxHeight: 400, overflowY: "auto" }}>
                  {testResult}
                </pre>
              ) : null}
            </div>
            {/* Modal footer */}
            {!testLoading && (
              <div className="px-6 pb-5 flex gap-3">
                <input
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  placeholder="New query…"
                  className="flex-1 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
                />
                <button
                  onClick={() => runAgentTest(agentOnChainUrl || webhookUrl || "https://agent.moltforge.cloud")}
                  className="px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: "#f0782822", border: "1px solid #f07828", color: "#f07828" }}>
                  Re-run
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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

function CheckCard({ checked, onClick, emoji, label, desc, accent = "#1db8a8" }: {
  checked: boolean; onClick: () => void; emoji: string; label: string; desc?: string; accent?: string;
}) {
  return (
    <button onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl text-left transition-all w-full"
      style={{ background: checked ? `${accent}15` : "#060c0b", border: `1px solid ${checked ? accent : "#1a2e2b"}` }}>
      <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors mt-0.5"
        style={{ background: checked ? accent : "transparent", border: `1.5px solid ${checked ? accent : "#1a2e2b"}` }}>
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-base flex-shrink-0">{emoji}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-forge-white/70">{label}</span>
        {desc && <span className="text-xs mt-0.5" style={{ color: "#3a5550" }}>{desc}</span>}
      </div>
    </button>
  );
}
