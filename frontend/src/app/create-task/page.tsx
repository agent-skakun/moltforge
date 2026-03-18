"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { parseUnits } from "viem";
import { useSearchParams } from "next/navigation";
import { ADDRESSES, ESCROW_ABI, ERC20_ABI, AGENT_REGISTRY_ABI } from "@/lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentOption {
  numericId: number;
  name: string;
  webhookUrl: string;
  agentUrl: string;
  status: number;
}

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

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function CreateTaskInner() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const presetAgentId = searchParams.get("agentId");

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
    presetAgentId ? Number(presetAgentId) : null
  );
  const [query, setQuery] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
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

  // Build descriptionCID from form data
  const descriptionCID = useMemo(() => {
    if (!query.trim()) return "";
    const payload = {
      query,
      agentId: selectedAgentId,
      agentUrl: selectedAgent?.agentUrl ?? "",
      reward: reward || "0",
      createdAt: new Date().toISOString(),
    };
    return `data:application/json;base64,${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
  }, [query, selectedAgentId, selectedAgent, reward]);

  // USDC approval
  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC, abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.MoltForgeEscrow] : undefined,
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
    // TaskCreated(uint256 taskId, ...) — first topic is event sig, second is taskId
    try {
      const log = createReceipt.logs[0];
      if (log?.topics[1]) {
        setCreatedTaskId(BigInt(log.topics[1]));
      }
    } catch { /* ignore */ }
  }, [created, createReceipt]);

  // After task created → POST to agent
  useEffect(() => {
    if (!created || !selectedAgent?.agentUrl || !query) return;
    const agentEndpoint = selectedAgent.agentUrl.replace(/\/$/, "") + "/tasks";
    setNotifyStatus("sending");
    fetch(agentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createdTaskId?.toString() ?? "pending",
        query,
        reward: reward || "0",
        agentUrl: selectedAgent.agentUrl,
        clientAddress: address,
      }),
    })
      .then(r => r.ok ? setNotifyStatus("ok") : setNotifyStatus("offline"))
      .catch(() => setNotifyStatus("offline"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created]);

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
            Hire an AI agent · Payment held in escrow until delivery confirmed
          </p>
        </div>

        {created ? (
          /* ── Success State ── */
          <div className="space-y-4">
            <div className="px-6 py-4 rounded-2xl text-center font-semibold"
              style={{ background: "#3ec95a20", border: "1px solid #3ec95a", color: "#3ec95a", fontFamily: "var(--font-space-grotesk)" }}>
              ✅ Task created on-chain!
            </div>

            <div className="px-6 py-4 rounded-xl space-y-3" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
              {createdTaskId && (
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Task ID</span>
                  <span className="text-sm font-bold" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>#{createdTaskId.toString()}</span>
                </div>
              )}
              {selectedAgent && (
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Agent</span>
                  <span className="text-sm" style={{ color: "#5a807a" }}>{selectedAgent.name}</span>
                </div>
              )}
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
                    🟢 Agent notified
                  </span>
                )}
                {notifyStatus === "offline" && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "#f0782820", color: "#f07828", border: "1px solid #f0782840" }}>
                    ⚠️ Agent offline — task pending
                  </span>
                )}
                {notifyStatus === "idle" && (
                  <span className="text-xs" style={{ color: "#3a5550" }}>No agent selected</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <a href="/dashboard"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: "#1db8a822", border: "1px solid #1db8a8", color: "#1db8a8", fontFamily: "var(--font-space-grotesk)" }}>
                View in Dashboard →
              </a>
              <a href="/marketplace"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-all"
                style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#5a807a" }}>
                Back to Marketplace
              </a>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="space-y-5">

            {/* Agent selector */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2"
                style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
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
                  style={{ background: "#0a1a17", border: `1px solid ${selectedAgentId ? "#1db8a8" : "#1a2e2b"}`,
                    color: selectedAgentId ? "#e8f5f3" : "#3a5550", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}>
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
                  🟢 <span className="truncate">{selectedAgent.agentUrl}</span>
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
                rows={4}
                placeholder="Research the latest DeFi protocols on Base blockchain and summarize opportunities…"
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
              <div className="relative">
                <input
                  type="number"
                  value={reward}
                  onChange={e => setReward(e.target.value)}
                  placeholder="10.00"
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl text-sm"
                  style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
                    fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
                />
                <span className="absolute right-4 top-3 text-sm" style={{ color: "#3a5550" }}>USDC</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "#3a5550" }}>
                + 2.5% protocol fee · held in escrow until you confirm delivery
              </p>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2"
                style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                Deadline <span style={{ color: "#1a2e2b" }}>(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
                  fontFamily: "var(--font-jetbrains-mono)", outline: "none", colorScheme: "dark" }}
              />
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => approve({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: "approve", args: [ADDRESSES.MoltForgeEscrow, rewardWei] })}
                disabled={!needsApproval || approving || waitingApproval || !query || !reward}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: (approved || !needsApproval) ? "#3ec95a15" : "#0a1a17",
                  border: `1px solid ${(approved || !needsApproval) ? "#3ec95a" : "#1a2e2b"}`,
                  color: (approved || !needsApproval) ? "#3ec95a" : "#5a807a",
                  cursor: (needsApproval && !approved && !approving && query && reward) ? "pointer" : "not-allowed",
                  opacity: (!query || !reward) ? 0.4 : 1,
                }}>
                {approving || waitingApproval ? "Approving…" : (approved || !needsApproval) ? "✓ Approved" : "Approve USDC"}
              </button>
              <button
                onClick={() => createTask({
                  address: ADDRESSES.MoltForgeEscrow, abi: ESCROW_ABI,
                  functionName: "createTask",
                  args: [ADDRESSES.USDC, rewardWei, descriptionCID, deadlineTs],
                })}
                disabled={needsApproval && !approved || creating || waitingCreate || !query || !reward}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: (creating || waitingCreate) ? "#0a1a17" : "linear-gradient(135deg, #f07828, #d05e10)",
                  border: "1px solid transparent",
                  color: "white",
                  cursor: (creating || waitingCreate || !query || !reward) ? "not-allowed" : "pointer",
                  opacity: (!query || !reward) ? 0.5 : 1,
                  fontFamily: "var(--font-space-grotesk)",
                  boxShadow: (creating || waitingCreate) ? "none" : "0 0 20px #f0782840",
                }}>
                {creating || waitingCreate ? "Creating…" : "🔥 Create Task"}
              </button>
            </div>

            {selectedAgent && (
              <div className="px-4 py-3 rounded-xl text-xs" style={{ background: "#0a1a17", border: "1px solid #1db8a820", color: "#3a5550" }}>
                After on-chain confirmation, task will be automatically sent to{" "}
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
