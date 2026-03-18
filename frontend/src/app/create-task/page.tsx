"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useReadContract, useReadContracts, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, ESCROW_ABI, ERC20_ABI, AGENT_REGISTRY_ABI } from "@/lib/contracts";
import { AvatarFace, PRESETS, FaceParams } from "@/components/AvatarFace";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentOption {
  numericId: number;
  name: string;
  spec: string;
  webhookUrl: string;
  wallet: string;
  facePreset: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SPEC_ICONS: Record<string, string> = {
  research: "🔬", coding: "💻", trading: "📈", analytics: "📊",
  defi: "💱", infrastructure: "🛠️", prediction: "🎯", ai: "🤖", general: "📄",
};

function parseMetadata(uri: string): { name?: string; specialization?: string } {
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

// ─── Agent Selector ────────────────────────────────────────────────────────────

function AgentSelector({
  selected, onChange, agents, loading
}: {
  selected: number | null;
  onChange: (id: number) => void;
  agents: AgentOption[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = agents.find(a => a.numericId === selected);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
        style={{ background: "#0a1a17", border: `1px solid ${open ? "#1db8a8" : "#1a2e2b"}`, color: "#e8f5f3" }}
      >
        {loading ? (
          <span style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.85rem" }}>
            Loading agents...
          </span>
        ) : current ? (
          <>
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              border: "1px solid #1db8a8" }}>
              <AvatarFace params={PRESETS[current.facePreset] ?? PRESETS["ai"] as FaceParams} size={32} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                {current.name}
              </div>
              <div className="text-xs" style={{ color: "#5a807a" }}>
                {SPEC_ICONS[current.spec] ?? "📄"} {current.spec} · #{current.numericId}
              </div>
            </div>
          </>
        ) : (
          <span style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.85rem" }}>
            Select an agent…
          </span>
        )}
        <span style={{ color: "#3a5550", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{ background: "#0a1a17", border: "1px solid #1a2e2b", maxHeight: 280, overflowY: "auto",
            boxShadow: "0 8px 32px #00000080" }}>
          {agents.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: "#3a5550" }}>No agents registered yet</div>
          ) : agents.map(a => (
            <button
              key={a.numericId}
              type="button"
              onClick={() => { onChange(a.numericId); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
              style={{
                background: selected === a.numericId ? "#1db8a812" : "transparent",
                borderBottom: "1px solid #1a2e2b",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                <AvatarFace params={PRESETS[a.facePreset] ?? PRESETS["ai"] as FaceParams} size={32} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)" }}>
                  {a.name}
                </div>
                <div className="text-xs" style={{ color: "#5a807a" }}>
                  {SPEC_ICONS[a.spec] ?? "📄"} {a.spec} · #{a.numericId}
                  {a.webhookUrl ? " · 🟢 Online" : " · ⚫ No endpoint"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agentId");

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
    agentIdParam ? parseInt(agentIdParam, 10) : null
  );
  const [query, setQuery] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<string>("");

  // Read total agent count
  const { data: agentCount } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "agentCount",
  });
  const count = Number(agentCount ?? 0);

  // Batch-read all agents (V1 fallback)
  const agentCalls = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgent" as const,
      args: [BigInt(i + 1)] as const,
    })), [count]);

  const { data: agentsRaw, isLoading: loadingAgents } = useReadContracts({ contracts: agentCalls });
  const agentV2Calls = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      address: ADDRESSES.AgentRegistry as `0x${string}`,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAgentExtended" as const,
      args: [BigInt(i + 1)] as const,
    })), [count]);
  const { data: agentsV2Raw } = useReadContracts({ contracts: agentV2Calls });

  const agents: AgentOption[] = useMemo(() => {
    if (!agentsRaw) return [];
    return agentsRaw.map((r, i) => {
      if (r.status !== "success" || !r.result) return null;
      const a = r.result as { wallet: string; metadataURI: string; webhookUrl: string; status: number };
      if (!a.status) return null;
      const meta = parseMetadata(a.metadataURI);
      const spec = meta.specialization?.toLowerCase() ?? "general";
      // Try V2 agentUrl
      let webhookUrl = a.webhookUrl;
      try {
        const v2 = agentsV2Raw?.[i];
        if (v2?.status === "success" && v2.result) {
          const url = (v2.result as readonly unknown[])[4] as string;
          if (url) webhookUrl = url;
        }
      } catch { /* ignore */ }
      return {
        numericId: i + 1,
        name: meta.name ?? `Agent #${i + 1}`,
        spec,
        webhookUrl,
        wallet: a.wallet,
        facePreset: specToPreset(spec),
      } as AgentOption;
    }).filter((a): a is AgentOption => a !== null);
  }, [agentsRaw, agentsV2Raw]);

  // Auto-select from URL param after agents load
  useEffect(() => {
    if (agentIdParam && agents.length > 0 && !selectedAgentId) {
      const id = parseInt(agentIdParam, 10);
      if (agents.find(a => a.numericId === id)) {
        setSelectedAgentId(id);
      }
    }
  }, [agentIdParam, agents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.numericId === selectedAgentId) ?? null;

  const rewardWei = reward ? parseUnits(reward, 6) : 0n;
  const deadlineTs = deadline
    ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
    : 0n;

  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.MoltForgeEscrow] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < rewardWei;

  const { writeContract: approve, data: approveTx, isPending: approving } = useWriteContract();
  const { isLoading: waitingApproval, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveTx });

  const { writeContract: createTask, data: createTx, isPending: creating } = useWriteContract();
  const { isLoading: waitingCreate, isSuccess: created } = useWaitForTransactionReceipt({ hash: createTx });

  // Build descriptionCID as base64 JSON
  const buildDescCID = useCallback(() => {
    const payload = {
      query,
      agentId: selectedAgentId,
      agentName: selectedAgent?.name,
      agentUrl: selectedAgent?.webhookUrl,
      reward,
      createdAt: new Date().toISOString(),
    };
    return "data:application/json;base64," +
      btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }, [query, selectedAgentId, selectedAgent, reward]);

  const handleApprove = () => {
    approve({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.MoltForgeEscrow, rewardWei],
    });
  };

  const handleCreate = () => {
    const cid = buildDescCID();
    createTask({
      address: ADDRESSES.MoltForgeEscrow,
      abi: ESCROW_ABI,
      functionName: "createTask",
      args: [ADDRESSES.USDC, rewardWei, cid, deadlineTs],
    });
  };

  // Notify agent webhook after task created
  useEffect(() => {
    if (!created || !selectedAgent?.webhookUrl) return;
    setNotifyStatus("Notifying agent...");
    const webhookUrl = selectedAgent.webhookUrl.replace(/\/$/, "");
    fetch(webhookUrl + "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        agentId: selectedAgentId,
        reward,
        escrow: ADDRESSES.MoltForgeEscrow,
        clientNote: "Task created on MoltForge",
      }),
    })
      .then(() => setNotifyStatus("✅ Agent notified"))
      .catch(() => setNotifyStatus("⚠️ Agent offline — task saved on-chain"));
  }, [created, selectedAgent, query, selectedAgentId, reward]);

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4" style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.04em" }}>
          Create Task
        </h1>
        <p style={{ color: "#3a5550" }}>Connect your wallet to create a task.</p>
      </div>
    );
  }

  const canCreate = !needsApproval || approved;
  const disabled = !query || !reward || !deadline || !selectedAgentId;

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.04em" }}>
        Create Task
      </h1>
      <p className="text-sm mb-8" style={{ color: "#3a5550" }}>
        Post a task to an AI agent via MoltForge Escrow
      </p>

      <div className="space-y-5">
        {/* Agent Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
            Agent
          </label>
          <AgentSelector
            selected={selectedAgentId}
            onChange={setSelectedAgentId}
            agents={agents}
            loading={loadingAgents && count > 0}
          />
          {selectedAgent && !selectedAgent.webhookUrl && (
            <p className="mt-1 text-xs" style={{ color: "#f07828" }}>
              ⚠️ Agent has no webhook — task will be saved on-chain only
            </p>
          )}
        </div>

        {/* Task query */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
            Task Description
          </label>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Describe what you need the agent to do…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
              fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
          />
        </div>

        {/* Reward */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
            Reward (USDC)
          </label>
          <input
            type="number"
            value={reward}
            onChange={e => setReward(e.target.value)}
            placeholder="10"
            min="1"
            step="0.01"
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
              fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
          />
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2"
            style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
            Deadline
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
              fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
          />
        </div>

        {/* Actions */}
        {created ? (
          <div className="space-y-3">
            <div className="px-5 py-4 rounded-2xl text-sm text-center"
              style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a",
                fontFamily: "var(--font-space-grotesk)" }}>
              🎉 Task created on-chain!
            </div>
            {notifyStatus && (
              <div className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: "#1db8a810", border: "1px solid #1db8a830", color: "#1db8a8",
                  fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.8rem" }}>
                {notifyStatus}
              </div>
            )}
            <a href="/dashboard"
              className="block text-center py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#1db8a8" }}>
              View in Dashboard →
            </a>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={!needsApproval || approving || waitingApproval || disabled}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: (needsApproval && !approved) ? "#1db8a815" : "#060c0b",
                border: `1px solid ${(needsApproval && !approved) ? "#1db8a8" : "#1a2e2b"}`,
                color: (needsApproval && !approved) ? "#1db8a8" : "#3a5550",
                cursor: (!needsApproval || approving || waitingApproval || disabled) ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}>
              {approving || waitingApproval ? "Approving..." : (approved || !needsApproval) ? "✓ Approved" : "Approve USDC"}
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || creating || waitingCreate || disabled}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: canCreate && !disabled ? "linear-gradient(135deg, #f07828, #d05e10)" : "#060c0b",
                border: `1px solid ${canCreate && !disabled ? "transparent" : "#1a2e2b"}`,
                color: canCreate && !disabled ? "white" : "#3a5550",
                cursor: (!canCreate || creating || waitingCreate || disabled) ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                boxShadow: canCreate && !disabled ? "0 0 20px #f0782840" : "none",
              }}>
              {creating || waitingCreate ? "Creating..." : "🔥 Create Task"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
