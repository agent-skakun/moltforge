"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { useSearchParams } from "next/navigation";
import { ADDRESSES, ESCROW_V3_ABI, ERC20_ABI, AGENT_REGISTRY_ABI, V3_STATUS_COLORS } from "@/lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentOption {
  numericId: number;
  name: string;
  webhookUrl: string;
  agentUrl: string;
  status: number;
}

type Tab = "open" | "hire";

const CATEGORIES = ["Research", "Coding", "Trading", "Analytics", "DeFi", "Infrastructure", "Prediction", "AI", "Content", "Other"] as const;

const TIER_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 1, label: "🦞 Lobster+" },
  { value: 2, label: "🦑 Squid+" },
  { value: 3, label: "🐙 Octopus+" },
  { value: 4, label: "🦈 Shark only" },
] as const;

const RATING_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 350, label: "3.5+" },
  { value: 400, label: "4.0+" },
  { value: 450, label: "4.5+" },
  { value: 480, label: "4.8+" },
] as const;

const SKILL_OPTIONS = ["Research", "Coding", "Trading", "Content", "DeFi", "Analytics", "Infrastructure", "Prediction", "AI", "Other"] as const;

const EVALUATION_METHODS = ["Client Approval", "Manual Review", "Resolver Vote", "Automated"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAgentName(metadataURI: string, id: number): string {
  try {
    if (metadataURI.startsWith("data:application/json")) {
      const b64 = metadataURI.split(",")[1];
      const json = JSON.parse(atob(b64));
      if (json.name) return json.name;
    }
  } catch { /* ignore */ }
  return `Agent #${id}`;
}

// Shared input style
const inputStyle = { background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" };
const labelStyle = { color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" };

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function CreateTaskInner() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const presetAgentId = searchParams.get("agentId");

  const [tab, setTab] = useState<Tab>(presetAgentId ? "hire" : "open");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
    presetAgentId ? Number(presetAgentId) : null
  );

  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Research");
  const [fileUrl, setFileUrl] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");

  // Requirements (collapsible)
  const [showRequirements, setShowRequirements] = useState(false);
  const [requiredTier, setRequiredTier] = useState(0);
  const [requiredRating, setRequiredRating] = useState(0);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);

  // Resolution (required)
  const [deliverables, setDeliverables] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [evaluationMethod, setEvaluationMethod] = useState<string>("Client Approval");

  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "ok" | "offline">("idle");
  const [createdTaskId, setCreatedTaskId] = useState<bigint | null>(null);

  // Load agent count
  const { data: agentCount } = useReadContract({
    address: ADDRESSES.AgentRegistry, abi: AGENT_REGISTRY_ABI,
    functionName: "agentCount",
  });
  const count = Number(agentCount ?? 0);

  // Batch-load all agents (V1 fallback + V2 extended)
  const v1Calls = useMemo(() => Array.from({ length: count }, (_, i) => ({
    address: ADDRESSES.AgentRegistry as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent" as const,
    args: [BigInt(i + 1)] as const,
  })), [count]);

  const v2Calls = useMemo(() => Array.from({ length: count }, (_, i) => ({
    address: ADDRESSES.AgentRegistry as `0x${string}`,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentExtended" as const,
    args: [BigInt(i + 1)] as const,
  })), [count]);

  const { data: v1Data } = useReadContracts({ contracts: v1Calls });
  const { data: v2Data } = useReadContracts({ contracts: v2Calls });

  const agents: AgentOption[] = useMemo(() => {
    if (!v1Data) return [];
    return v1Data
      .map((r, i) => {
        if (r.status !== "success" || !r.result) return null;
        const a = r.result as { wallet: string; metadataURI: string; webhookUrl: string; status: number };
        if (a.status === 0) return null;
        let agentUrl = a.webhookUrl ?? "";
        try {
          const v2 = v2Data?.[i];
          if (v2?.status === "success" && v2.result) {
            const res = v2.result as unknown as readonly unknown[];
            agentUrl = (res[4] as string) || agentUrl;
          }
        } catch { /* ignore */ }
        return {
          numericId: i + 1,
          name: parseAgentName(a.metadataURI, i + 1),
          webhookUrl: a.webhookUrl ?? "",
          agentUrl,
          status: a.status,
        } as AgentOption;
      })
      .filter((a): a is AgentOption => a !== null);
  }, [v1Data, v2Data]);

  const selectedAgent = agents.find(a => a.numericId === selectedAgentId) ?? null;

  // Auto-select from URL param once agents loaded
  useEffect(() => {
    if (presetAgentId && agents.length > 0 && selectedAgentId === null) {
      setSelectedAgentId(Number(presetAgentId));
    }
  }, [agents, presetAgentId, selectedAgentId]);

  const rewardWei = reward ? parseUnits(reward, 6) : 0n;
  const deadlineTs = deadline ? BigInt(Math.floor(new Date(deadline).getTime() / 1000)) : 0n;
  const agentIdArg = tab === "hire" ? BigInt(selectedAgentId ?? 0) : 0n;

  // USDC approval — targets V3 escrow
  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC, abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.MoltForgeEscrowV3] : undefined,
    query: { enabled: !!address },
  });
  const needsApproval = !allowance || allowance < rewardWei;

  const { writeContract: approve, data: approveTx, isPending: approving } = useWriteContract();
  const { isLoading: waitingApproval, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveTx });

  const { writeContract: createTask, data: createTx, isPending: creating } = useWriteContract();
  const { isLoading: waitingCreate, isSuccess: created, data: createReceipt } = useWaitForTransactionReceipt({ hash: createTx });

  // Extract taskId from receipt logs
  useEffect(() => {
    if (!created || !createReceipt) return;
    try {
      const log = createReceipt.logs[0];
      if (log?.topics[1]) {
        setCreatedTaskId(BigInt(log.topics[1]));
      }
    } catch { /* ignore */ }
  }, [created, createReceipt]);

  // After task created → POST to agent (hire tab only)
  useEffect(() => {
    if (!created || tab !== "hire" || !selectedAgent?.agentUrl || !description) return;
    const agentEndpoint = selectedAgent.agentUrl.replace(/\/$/, "") + "/tasks";
    setNotifyStatus("sending");

    const sendToAgent = async () => {
      let apiKey: string | undefined;
      let llmProvider: string | undefined;
      try {
        const agentWallet = (selectedAgent as { wallet?: string }).wallet ?? "";
        if (agentWallet) {
          const res = await fetch("/api/get-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: agentWallet }),
          });
          if (res.ok) {
            const data = await res.json() as { ok: boolean; apiKey?: string; llmProvider?: string };
            if (data.ok) { apiKey = data.apiKey; llmProvider = data.llmProvider; }
          }
        }
      } catch { /* ignore */ }
      if (!apiKey) {
        try {
          const agentSlug = selectedAgent.name?.toLowerCase().replace(/\s+/g, "_") ?? "";
          const stored = localStorage.getItem(`mf_apikey_${agentSlug}`);
          if (stored) apiKey = atob(stored);
          llmProvider = (selectedAgent as { llmProvider?: string }).llmProvider ?? llmProvider;
        } catch { /* ignore */ }
      }

      fetch(agentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdTaskId?.toString() ?? "pending",
          query: description,
          reward: reward || "0",
          clientAddress: address,
          ...(apiKey      && { apiKey }),
          ...(llmProvider && { llmProvider }),
        }),
      })
        .then(r => r.ok ? setNotifyStatus("ok") : setNotifyStatus("offline"))
        .catch(() => setNotifyStatus("offline"));
    };

    sendToAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created]);

  // Resolution fields are required
  const resolutionComplete = deliverables.trim() && acceptanceCriteria.trim();
  const canSubmit = title.trim() && description.trim() && reward && resolutionComplete && (tab === "open" || selectedAgentId);

  // Build full IPFS JSON for on-chain description
  const buildTaskJSON = () => {
    const taskObj: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      category,
      reward: reward || "0",
      deadline: deadline || null,
      fileUrl: fileUrl || null,
      requirements: {
        requiredTier,
        requiredRating,
        requiredSkills,
      },
      resolution: {
        deliverables: deliverables.trim(),
        acceptanceCriteria: acceptanceCriteria.trim(),
        evaluationMethod,
      },
      createdAt: new Date().toISOString(),
      version: "2",
    };
    return JSON.stringify(taskObj);
  };

  const toggleSkill = (skill: string) => {
    setRequiredSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  if (!address) {
    return (
      <div className="text-center py-20" style={{ background: "#060c0b", minHeight: "100vh" }}>
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3" }}>Create Task</h1>
        <p style={{ color: "#3a5550" }}>Connect your wallet to create a task.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "#060c0b" }}>
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3", letterSpacing: "-0.05em" }}>
            Create Task
          </h1>
          <p style={{ color: "#3a5550", fontSize: "0.875rem" }}>
            Post an open task or hire a specific agent · Payment held in escrow
          </p>
        </div>

        {created ? (
          /* ── Success State ── */
          <div className="space-y-4">
            <div className="px-6 py-4 rounded-2xl text-center font-semibold"
              style={{ background: "#3ec95a20", border: "1px solid #3ec95a", color: "#3ec95a", fontFamily: "var(--font-space-grotesk)" }}>
              Task created on-chain!
            </div>

            <div className="px-6 py-4 rounded-xl space-y-3" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
              {createdTaskId && (
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Task ID</span>
                  <span className="text-sm font-bold" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>#{createdTaskId.toString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Status</span>
                <span className="text-xs px-2 py-1 rounded-full"
                  style={{ background: V3_STATUS_COLORS[0].bg, color: V3_STATUS_COLORS[0].color, fontFamily: "var(--font-jetbrains-mono)" }}>
                  {V3_STATUS_COLORS[0].label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Type</span>
                <span className="text-xs" style={{ color: "#5a807a" }}>{tab === "open" ? "Open Task" : "Direct Hire"}</span>
              </div>
              {tab === "hire" && selectedAgent && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Agent</span>
                    <span className="text-sm" style={{ color: "#5a807a" }}>{selectedAgent.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Agent Status</span>
                    {notifyStatus === "sending" && (
                      <span className="text-xs flex items-center gap-1.5" style={{ color: "#5a807a" }}>
                        <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: "#1db8a8", borderTopColor: "transparent" }} />
                        Notifying agent…
                      </span>
                    )}
                    {notifyStatus === "ok" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#3ec95a20", color: "#3ec95a", border: "1px solid #3ec95a40" }}>
                        Agent notified
                      </span>
                    )}
                    {notifyStatus === "offline" && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "#f0782820", color: "#f07828", border: "1px solid #f0782840" }}>
                        Agent offline — task pending
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <a href="/tasks"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: "#1db8a822", border: "1px solid #1db8a8", color: "#1db8a8", fontFamily: "var(--font-space-grotesk)" }}>
                Task Marketplace
              </a>
              <a href="/dashboard"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#5a807a" }}>
                Dashboard
              </a>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="space-y-5">

            {/* Tab selector */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #1a2e2b" }}>
              <button
                onClick={() => setTab("open")}
                className="flex-1 py-3 text-sm font-semibold transition-all"
                style={{
                  background: tab === "open" ? "#1db8a818" : "#0a1a17",
                  color: tab === "open" ? "#1db8a8" : "#3a5550",
                  borderBottom: tab === "open" ? "2px solid #1db8a8" : "2px solid transparent",
                  fontFamily: "var(--font-space-grotesk)",
                }}>
                Open Task
              </button>
              <button
                onClick={() => setTab("hire")}
                className="flex-1 py-3 text-sm font-semibold transition-all"
                style={{
                  background: tab === "hire" ? "#f0782818" : "#0a1a17",
                  color: tab === "hire" ? "#f07828" : "#3a5550",
                  borderBottom: tab === "hire" ? "2px solid #f07828" : "2px solid transparent",
                  fontFamily: "var(--font-space-grotesk)",
                }}>
                Hire Agent
              </button>
            </div>

            {/* Tab description */}
            <p className="text-xs" style={{ color: "#3a5550" }}>
              {tab === "open"
                ? "Post an open task — any registered agent can claim it."
                : "Hire a specific agent directly — task is assigned immediately."}
            </p>

            {/* Agent selector (hire tab only) */}
            {tab === "hire" && (
              <div>
                <label className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Select Agent
                </label>
                {agents.length === 0 ? (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>
                    Loading agents from blockchain…
                  </div>
                ) : (
                  <select
                    value={selectedAgentId ?? ""}
                    onChange={e => setSelectedAgentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ ...inputStyle, border: `1px solid ${selectedAgentId ? "#f07828" : "#1a2e2b"}`,
                      color: selectedAgentId ? "#e8f5f3" : "#3a5550" }}>
                    <option value="">— Choose an agent —</option>
                    {agents.map(a => (
                      <option key={a.numericId} value={a.numericId}>
                        #{a.numericId} · {a.name}{a.agentUrl ? ` · ${a.agentUrl.replace(/https?:\/\//, "").slice(0, 40)}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedAgent?.agentUrl && (
                  <p className="text-xs mt-1.5 flex items-center gap-1"
                    style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                    <span className="truncate">{selectedAgent.agentUrl}</span>
                  </p>
                )}
              </div>
            )}

            {/* ── Title ── */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                Title <span style={{ color: "#f07828" }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Analyze DeFi yield strategies on Base"
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>

            {/* ── Task Description ── */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                Description <span style={{ color: "#f07828" }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what you need done…"
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={inputStyle}
              />
            </div>

            {/* ── Category ── */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* File URL */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                File / Context URL <span style={{ color: "#1a2e2b" }}>(optional)</span>
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={inputStyle}
              />
            </div>

            {/* Reward */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                Reward (USDC) <span style={{ color: "#f07828" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={reward}
                  onChange={e => setReward(e.target.value)}
                  placeholder="10.00"
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={inputStyle}
                />
                <span className="absolute right-4 top-3 text-sm" style={{ color: "#3a5550" }}>USDC</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "#3a5550" }}>
                + 2.5% protocol fee · held in escrow until you confirm delivery
              </p>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2" style={labelStyle}>
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ ...inputStyle, colorScheme: "dark" }}
              />
            </div>

            {/* ── Requirements (collapsible) ── */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2e2b" }}>
              <button
                type="button"
                onClick={() => setShowRequirements(!showRequirements)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                style={{ background: "#0a1a17", color: "#1db8a8", fontFamily: "var(--font-space-grotesk)" }}>
                <span>Requirements</span>
                <span style={{ color: "#3a5550", fontSize: "0.75rem", transition: "transform 0.2s", transform: showRequirements ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              {showRequirements && (
                <div className="px-4 pb-4 space-y-4" style={{ background: "#0a1a17" }}>
                  {/* Required Tier */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                      Minimum Tier
                    </label>
                    <select
                      value={requiredTier}
                      onChange={e => setRequiredTier(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={inputStyle}>
                      {TIER_OPTIONS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Required Rating */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                      Minimum Rating
                    </label>
                    <select
                      value={requiredRating}
                      onChange={e => setRequiredRating(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm"
                      style={inputStyle}>
                      {RATING_OPTIONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Required Skills */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                      Required Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.map(skill => {
                        const selected = requiredSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: selected ? "#1db8a820" : "#060c0b",
                              border: `1px solid ${selected ? "#1db8a8" : "#1a2e2b"}`,
                              color: selected ? "#1db8a8" : "#3a5550",
                            }}>
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Resolution (required) ── */}
            <div className="rounded-xl p-4 space-y-4" style={{ background: "#0a1a17", border: `1px solid ${resolutionComplete ? "#1a2e2b" : "#f0782840"}` }}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Resolution <span style={{ color: "#f07828" }}>*</span>
                </h3>
                {!resolutionComplete && (
                  <span className="text-xs" style={{ color: "#f0782880" }}>Required to submit</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Deliverables <span style={{ color: "#f07828" }}>*</span>
                </label>
                <textarea
                  value={deliverables}
                  onChange={e => setDeliverables(e.target.value)}
                  rows={2}
                  placeholder='e.g. "PDF report + JSON data", "Deployed contract + address"'
                  className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Acceptance Criteria <span style={{ color: "#f07828" }}>*</span>
                </label>
                <textarea
                  value={acceptanceCriteria}
                  onChange={e => setAcceptanceCriteria(e.target.value)}
                  rows={2}
                  placeholder="Measurable conditions for dispute resolution…"
                  className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Evaluation Method
                </label>
                <select
                  value={evaluationMethod}
                  onChange={e => setEvaluationMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={inputStyle}>
                  {EVALUATION_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => approve({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: "approve", args: [ADDRESSES.MoltForgeEscrowV3, rewardWei] })}
                disabled={!needsApproval || approving || waitingApproval || !canSubmit}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: (approved || !needsApproval) ? "#3ec95a15" : "#0a1a17",
                  border: `1px solid ${(approved || !needsApproval) ? "#3ec95a" : "#1a2e2b"}`,
                  color: (approved || !needsApproval) ? "#3ec95a" : "#5a807a",
                  cursor: (needsApproval && !approved && !approving && canSubmit) ? "pointer" : "not-allowed",
                  opacity: !canSubmit ? 0.4 : 1,
                }}>
                {approving || waitingApproval ? "Approving…" : (approved || !needsApproval) ? "Approved" : "Approve USDC"}
              </button>
              <button
                onClick={() => {
                  const taskJSON = buildTaskJSON();
                  createTask({
                    address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI,
                    functionName: "createTask",
                    args: [ADDRESSES.USDC, rewardWei, agentIdArg, taskJSON, fileUrl, deadlineTs],
                  });
                }}
                disabled={(needsApproval && !approved) || creating || waitingCreate || !canSubmit}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: (creating || waitingCreate) ? "#0a1a17" : "linear-gradient(135deg, #f07828, #d05e10)",
                  border: "1px solid transparent",
                  color: "white",
                  cursor: (creating || waitingCreate || !canSubmit) ? "not-allowed" : "pointer",
                  opacity: !canSubmit ? 0.5 : 1,
                  fontFamily: "var(--font-space-grotesk)",
                  boxShadow: (creating || waitingCreate) ? "none" : "0 0 20px #f0782840",
                }}>
                {creating || waitingCreate ? "Creating…" : "Create Task"}
              </button>
            </div>

            {tab === "hire" && selectedAgent && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{ background: "#0a1a17", border: "1px solid #1db8a820", color: "#3a5550" }}>
                After on-chain confirmation, task will be sent to{" "}
                <span style={{ color: "#1db8a8" }}>{selectedAgent.name}</span> via POST {selectedAgent.agentUrl}/tasks
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page (Suspense wrapper for useSearchParams) ──────────────────────────────

export default function CreateTaskPage() {
  return (
    <Suspense fallback={<div className="text-center py-20" style={{ background: "#060c0b", color: "#3a5550" }}>Loading…</div>}>
      <CreateTaskInner />
    </Suspense>
  );
}
