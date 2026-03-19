"use client";

import React from "react";
import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI, ESCROW_ABI, ESCROW_V3_ABI, TIER_NAMES, V3_STATUS_COLORS } from "@/lib/contracts";
import { parseMetadataSync, parseMetadataURI, metadataToDataURI, type AgentMetadata } from "@/lib/metadata";
import { AvatarFace, PRESETS, FaceParams } from "@/components/AvatarFace";
import Link from "next/link";

// ─── Result / Description helpers ─────────────────────────────────────────────

function decodeDescription(raw: string): string {
  try {
    if (raw.startsWith("data:application/json;base64,")) {
      const decoded = atob(raw.replace("data:application/json;base64,", ""));
      const p = JSON.parse(decoded) as Record<string, unknown>;
      return (p.description as string) || (p.title as string) || decoded;
    }
    if (raw.startsWith("data:text/markdown;base64,")) {
      return atob(raw.replace("data:text/markdown;base64,", ""));
    }
    if (raw.startsWith("{")) {
      const p = JSON.parse(raw) as Record<string, unknown>;
      return (p.description as string) || raw;
    }
  } catch { /* ignore */ }
  return raw;
}

function renderResult(resultUrl: string): React.ReactNode {
  if (!resultUrl) return null;
  if (resultUrl.startsWith("data:text/markdown;base64,")) {
    const decoded = atob(resultUrl.replace("data:text/markdown;base64,", ""));
    return <pre className="text-sm whitespace-pre-wrap break-words" style={{ color: "#8ab5af", fontFamily: "var(--font-inter)", lineHeight: 1.7 }}>{decoded}</pre>;
  }
  if (resultUrl.startsWith("data:application/json;base64,")) {
    try {
      const decoded = atob(resultUrl.replace("data:application/json;base64,", ""));
      return <pre className="text-xs overflow-x-auto" style={{ color: "#8ab5af", fontFamily: "var(--font-jetbrains-mono)", lineHeight: 1.6 }}>{JSON.stringify(JSON.parse(decoded), null, 2)}</pre>;
    } catch {
      return <pre className="text-sm whitespace-pre-wrap" style={{ color: "#8ab5af", fontFamily: "var(--font-jetbrains-mono)" }}>{atob(resultUrl.replace("data:application/json;base64,", ""))}</pre>;
    }
  }
  if (resultUrl.startsWith("http")) {
    return <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-sm break-all" style={{ color: "#1db8a8", textDecoration: "underline", textUnderlineOffset: 3 }}>{resultUrl}</a>;
  }
  return <pre className="text-sm whitespace-pre-wrap break-all" style={{ color: "#8ab5af", fontFamily: "var(--font-jetbrains-mono)" }}>{resultUrl}</pre>;
}

// ─── V1 Constants ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { label: "Open",       color: "#1db8a8", bg: "#1db8a812", icon: "🔵" },
  { label: "InProgress", color: "#f07828", bg: "#f0782812", icon: "🟡" },
  { label: "Delivered",  color: "#e8c842", bg: "#e8c84212", icon: "📬" },
  { label: "Completed",  color: "#3ec95a", bg: "#3ec95a12", icon: "✅" },
  { label: "Disputed",   color: "#e63030", bg: "#e6303012", icon: "⚠️" },
  { label: "Cancelled",  color: "#3a5550", bg: "#3a555012", icon: "⛔" },
];

// ─── V3 Task Type ─────────────────────────────────────────────────────────────

interface V3Task {
  id: bigint;
  client: string;
  agentId: bigint;
  token: string;
  reward: bigint;
  fee: bigint;
  description: string;
  fileUrl: string;
  resultUrl: string;
  status: number;
  claimedBy: string;
  score: number;
  createdAt: bigint;
  deadlineAt: bigint;
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl transition-all"
          style={{ color: star <= value ? "#e8c842" : "#1a2e2b", lineHeight: 1 }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── V1 Task Item (Legacy) ───────────────────────────────────────────────────

function TaskItem({ taskId, address }: { taskId: number; address: string }) {
  const [rating, setRating] = useState(5);
  const [showRating, setShowRating] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const { data: task } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  });

  const { writeContract: confirm, data: confirmTx, isPending: confirming } = useWriteContract();
  const { isLoading: waitConfirm, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: confirmTx });

  const { writeContract: cancel, data: cancelTx, isPending: cancelling } = useWriteContract();
  const { isLoading: waitCancel, isSuccess: cancelled } = useWaitForTransactionReceipt({ hash: cancelTx });

  if (!task) return null;

  const isClient = task.client.toLowerCase() === address.toLowerCase();
  const isAgent  = task.agent?.toLowerCase() === address.toLowerCase();
  if (!isClient && !isAgent) return null;

  const status = task.status;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[0];
  const isDelivered = status === 2;
  const isOpen = status === 0;
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = task.deadlineAt > 0n && Number(task.deadlineAt) < now;
  const noAgent = !task.agent || task.agent === "0x0000000000000000000000000000000000000000";

  let taskDesc = "";
  try {
    if (task.descriptionCID.startsWith("data:application/json")) {
      const b64 = task.descriptionCID.split(",")[1];
      const parsed = JSON.parse(atob(b64));
      taskDesc = parsed.query ?? parsed.description ?? "";
    } else {
      taskDesc = task.descriptionCID;
    }
  } catch { taskDesc = task.descriptionCID; }

  let deliveryText = "";
  try {
    if (task.deliveryCID?.startsWith("data:application/json")) {
      const b64 = task.deliveryCID.split(",")[1];
      const parsed = JSON.parse(atob(b64));
      deliveryText = parsed.summary ?? parsed.result ?? JSON.stringify(parsed).slice(0, 300);
    } else if (task.deliveryCID) {
      deliveryText = task.deliveryCID;
    }
  } catch { deliveryText = task.deliveryCID ?? ""; }

  const handleConfirm = () => {
    confirm({
      address: ADDRESSES.MoltForgeEscrow,
      abi: ESCROW_ABI,
      functionName: "releasePaymentWithScore",
      args: [BigInt(taskId), rating],
    });
    setShowRating(false);
  };

  const handleCancel = () => {
    cancel({
      address: ADDRESSES.MoltForgeEscrow,
      abi: ESCROW_ABI,
      functionName: "cancelTask",
      args: [BigInt(taskId)],
    });
    setCancelConfirm(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "#0a1a17", border: `1px solid ${cfg.color}30` }}>
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid #1a2e2b" }}>
        <div>
          <span className="text-xs font-semibold" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
            Task #{taskId}
          </span>
          {isClient && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ background: "#1db8a812", color: "#1db8a8", fontSize: "0.65rem" }}>CLIENT</span>
          )}
          {isAgent && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ background: "#f0782812", color: "#f07828", fontSize: "0.65rem" }}>AGENT</span>
          )}
        </div>
        <span className="text-xs px-2 py-1 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem" }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {taskDesc && (
          <p className="text-sm" style={{ color: "#5a807a" }}>
            {taskDesc.slice(0, 200)}{taskDesc.length > 200 ? "..." : ""}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          <div>
            <span style={{ color: "#3a5550" }}>Reward </span>
            <span style={{ color: "#f07828" }}>{formatUnits(task.reward, 6)} USDC</span>
          </div>
          {task.deadlineAt > 0n && (
            <div>
              <span style={{ color: "#3a5550" }}>Deadline </span>
              <span style={{ color: deadlinePassed ? "#e63030" : "#5a807a" }}>
                {new Date(Number(task.deadlineAt) * 1000).toLocaleDateString()}
                {deadlinePassed ? " (expired)" : ""}
              </span>
            </div>
          )}
        </div>
        {deliveryText && (
          <div className="p-3 rounded-xl text-xs"
            style={{ background: "#060c0b", border: "1px solid #1db8a820",
              color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)", maxHeight: 80, overflowY: "auto" }}>
            <span style={{ color: "#1db8a8" }}>Delivery: </span>{deliveryText}
          </div>
        )}
        {isClient && isDelivered && !confirmed && (
          <div>
            {!showRating ? (
              <button onClick={() => setShowRating(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a", fontFamily: "var(--font-space-grotesk)" }}>
                Confirm + Rate
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl" style={{ background: "#060c0b", border: "1px solid #3ec95a30" }}>
                <p className="text-xs" style={{ color: "#5a807a" }}>Rate the agent (1–5 stars):</p>
                <StarRating value={rating} onChange={setRating} />
                <div className="flex gap-2">
                  <button onClick={() => setShowRating(false)}
                    className="flex-1 py-2 rounded-xl text-xs transition-all"
                    style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Cancel</button>
                  <button onClick={handleConfirm} disabled={confirming || waitConfirm}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "#3ec95a", color: "white", cursor: (confirming || waitConfirm) ? "wait" : "pointer" }}>
                    {confirming || waitConfirm ? "Confirming..." : `Confirm ${rating}★`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {confirmed && (
          <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>Payment released</div>
        )}
        {isClient && isOpen && (deadlinePassed || noAgent) && !cancelled && (
          <div>
            {!cancelConfirm ? (
              <button onClick={() => setCancelConfirm(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#e6303018", border: "1px solid #e63030", color: "#e63030" }}>
                Cancel Task
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setCancelConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs"
                  style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Keep</button>
                <button onClick={handleCancel} disabled={cancelling || waitCancel}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "#e63030", color: "white" }}>
                  {cancelling || waitCancel ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── V3 Task Item ─────────────────────────────────────────────────────────────

function V3TaskItem({ task, role }: { task: V3Task; role: "client" | "agent" }) {
  const [rating, setRating] = useState(5);
  const [showRating, setShowRating] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [resultUrlInput, setResultUrlInput] = useState("");

  const { writeContract: confirmDelivery, data: confirmTx, isPending: confirming } = useWriteContract();
  const { isLoading: waitConfirm, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: confirmTx });

  const { writeContract: cancelTask, data: cancelTx, isPending: cancelling } = useWriteContract();
  const { isLoading: waitCancel, isSuccess: cancelled } = useWaitForTransactionReceipt({ hash: cancelTx });

  const { writeContract: disputeTask, data: disputeTx, isPending: disputing } = useWriteContract();
  const { isLoading: waitDispute, isSuccess: disputed } = useWaitForTransactionReceipt({ hash: disputeTx });

  const { writeContract: submitResult, data: submitTx, isPending: submitting } = useWriteContract();
  const { isLoading: waitSubmit, isSuccess: submitted } = useWaitForTransactionReceipt({ hash: submitTx });

  const status = task.status;
  const cfg = V3_STATUS_COLORS[status as keyof typeof V3_STATUS_COLORS] ?? V3_STATUS_COLORS[0];
  const isOpen = status === 0;
  const isDelivered = status === 3;
  const isConfirmed = status === 4;
  const isClaimed = status === 1;
  const isInProgress = status === 2;
  const zero = "0x0000000000000000000000000000000000000000";

  const handleConfirm = () => {
    confirmDelivery({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "confirmDelivery",
      args: [task.id, rating],
    });
    setShowRating(false);
  };

  const handleCancel = () => {
    cancelTask({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "cancelTask",
      args: [task.id],
    });
    setCancelConfirm(false);
  };

  const handleDispute = () => {
    disputeTask({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "disputeTask",
      args: [task.id],
    });
  };

  const handleSubmit = () => {
    submitResult({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "submitResult",
      args: [task.id, resultUrlInput],
    });
    setShowSubmit(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: "#0a1a17", border: `1px solid ${cfg.color}30` }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a2e2b" }}>
        <div>
          <span className="text-xs font-semibold" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
            Task #{task.id.toString()}
          </span>
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
            style={{
              background: role === "client" ? "#1db8a812" : "#f0782812",
              color: role === "client" ? "#1db8a8" : "#f07828",
              fontSize: "0.65rem",
            }}>
            {role.toUpperCase()}
          </span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem" }}>
          {cfg.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-sm" style={{ color: "#5a807a" }}>
          {(() => { const d = decodeDescription(task.description); return d.length > 200 ? d.slice(0, 200) + "…" : d; })()}
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          <div>
            <span style={{ color: "#3a5550" }}>Reward </span>
            <span style={{ color: "#f07828" }}>{formatUnits(task.reward, 6)} USDC</span>
          </div>
          {role === "client" && task.claimedBy !== zero && (
            <div>
              <span style={{ color: "#3a5550" }}>Agent </span>
              <span style={{ color: "#5a807a" }}>{task.claimedBy.slice(0, 6)}…{task.claimedBy.slice(-4)}</span>
            </div>
          )}
          {role === "agent" && (
            <div>
              <span style={{ color: "#3a5550" }}>Client </span>
              <span style={{ color: "#5a807a" }}>{task.client.slice(0, 6)}…{task.client.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Result — full view for client only, lock for agent */}
        {task.resultUrl && (isDelivered || isConfirmed) && (
          <div className="p-3 rounded-xl" style={{ background: "#060c0b", border: "1px solid #1db8a820" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>SUBMITTED RESULT</p>
            {role === "client" ? (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>{renderResult(task.resultUrl)}</div>
            ) : (
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span className="text-xs" style={{ color: "#5a807a" }}>Result visible to task client only</span>
              </div>
            )}
          </div>
        )}

        {/* Agent: confirmed → show score */}
        {role === "agent" && isConfirmed && (
          <div className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <span style={{ color: "#3ec95a" }}>Reward earned: {formatUnits(task.reward, 6)} USDC</span>
            <span style={{ color: "#e8c842" }}>Score: {task.score}★</span>
          </div>
        )}

        {/* CLIENT ACTIONS */}
        {role === "client" && (
          <>
            {/* Cancel (Open only) */}
            {isOpen && !cancelled && (
              <div>
                {!cancelConfirm ? (
                  <button onClick={() => setCancelConfirm(true)}
                    className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "#e6303018", border: "1px solid #e63030", color: "#e63030" }}>
                    Cancel Task
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setCancelConfirm(false)}
                      className="flex-1 py-2 rounded-xl text-xs"
                      style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Keep</button>
                    <button onClick={handleCancel} disabled={cancelling || waitCancel}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "#e63030", color: "white" }}>
                      {cancelling || waitCancel ? "Cancelling…" : "Confirm Cancel"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {cancelled && <div className="py-2 text-sm text-center" style={{ color: "#6b7280" }}>Task cancelled</div>}

            {/* Confirm + Rate (Delivered) */}
            {isDelivered && !confirmed && (
              <div>
                {!showRating ? (
                  <div className="flex gap-2">
                    <button onClick={() => setShowRating(true)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a", fontFamily: "var(--font-space-grotesk)" }}>
                      Confirm + Rate
                    </button>
                    <button onClick={handleDispute} disabled={disputing || waitDispute}
                      className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "#e6303018", border: "1px solid #e63030", color: "#e63030" }}>
                      {disputing || waitDispute ? "…" : "Dispute"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl" style={{ background: "#060c0b", border: "1px solid #3ec95a30" }}>
                    <p className="text-xs" style={{ color: "#5a807a" }}>Rate the agent (1–5):</p>
                    <StarRating value={rating} onChange={setRating} />
                    <div className="flex gap-2">
                      <button onClick={() => setShowRating(false)}
                        className="flex-1 py-2 rounded-xl text-xs"
                        style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Cancel</button>
                      <button onClick={handleConfirm} disabled={confirming || waitConfirm}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "#3ec95a", color: "white" }}>
                        {confirming || waitConfirm ? "Confirming…" : `Confirm ${rating}★`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {confirmed && <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>Payment released</div>}
            {disputed && <div className="py-2 text-sm text-center" style={{ color: "#e63030" }}>Dispute opened</div>}
          </>
        )}

        {/* AGENT ACTIONS */}
        {role === "agent" && (
          <>
            {/* Submit Result (Claimed/InProgress) */}
            {(isClaimed || isInProgress) && !submitted && (
              <div>
                {!showSubmit ? (
                  <button onClick={() => setShowSubmit(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "#1db8a818", border: "1px solid #1db8a8", color: "#1db8a8", fontFamily: "var(--font-space-grotesk)" }}>
                    Submit Result
                  </button>
                ) : (
                  <div className="space-y-3 p-4 rounded-xl" style={{ background: "#060c0b", border: "1px solid #1db8a830" }}>
                    <p className="text-xs" style={{ color: "#5a807a" }}>Result URL:</p>
                    <textarea
                      value={resultUrlInput}
                      onChange={e => setResultUrlInput(e.target.value)}
                      rows={2}
                      placeholder="https://... or paste result"
                      className="w-full px-3 py-2 rounded-lg text-xs resize-none"
                      style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
                        fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowSubmit(false)}
                        className="flex-1 py-2 rounded-xl text-xs"
                        style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Cancel</button>
                      <button onClick={handleSubmit} disabled={submitting || waitSubmit || !resultUrlInput.trim()}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "#1db8a8", color: "white" }}>
                        {submitting || waitSubmit ? "Submitting…" : "Submit"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {submitted && <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>Result submitted</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Agent Profile ────────────────────────────────────────────────────────────

function AgentProfile({ address }: { address: `0x${string}` }) {
  const { data: agentId } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: [address],
  });

  const hasAgent = agentId && agentId > 0n;

  const { data: agent } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: hasAgent ? [agentId] : undefined,
    query: { enabled: !!hasAgent },
  });

  const { data: meritScore } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getMeritScore",
    args: [address],
    query: { enabled: !!hasAgent },
  });

  const _parseMeta = (uri: string): AgentMetadata => {
    return parseMetadataSync(uri ?? "");
  }

  const [ipfsMeta, setIpfsMeta] = useState<AgentMetadata>({});
  const [showEditModal, setShowEditModal] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const uri = agent?.metadataURI;
    if (!uri) return;
    parseMetadataURI(uri).then(setIpfsMeta).catch(() => {});
  }, [agent?.metadataURI]);

  const rawMeta = agent ? _parseMeta(agent.metadataURI) : {};
  const meta: AgentMetadata = { ...rawMeta, ...ipfsMeta };
  const spec = meta.specialization?.toLowerCase() ?? "general";
  const presetMap: Record<string, string> = {
    research: "journalist", coding: "developer", trading: "trader",
    analytics: "finance", defi: "trader", infrastructure: "worker",
    prediction: "creative", ai: "ai", general: "teacher",
  };
  const preset = presetMap[spec] ?? "ai";

  return (
    <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4"
        style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
        My Agent
      </h2>
      {!hasAgent ? (
        <div>
          <p className="text-sm mb-4" style={{ color: "#3a5550" }}>No agent registered.</p>
          <Link href="/register-agent"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#f0782815", border: "1px solid #f07828", color: "#f07828" }}>
            Register Agent
          </Link>
        </div>
      ) : agent ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
              border: "2px solid #1db8a8" }}>
              <AvatarFace params={PRESETS[preset] ?? PRESETS["ai"] as FaceParams} size={48} />
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)" }}>
                {meta.name ?? `Agent #${agentId?.toString()}`}
              </div>
              <Link href={`/agent/${agentId?.toString()}`}
                className="text-xs" style={{ color: "#1db8a8" }}>
                #{agentId?.toString()} →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tier", value: TIER_NAMES[agent.tier] ?? "Unknown" },
              { label: "Jobs", value: agent.jobsCompleted.toString() },
              { label: "Rating", value: (agent.rating / 100).toFixed(2) },
              { label: "Merit", value: meritScore?.toString() ?? "..." },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                <p className="text-base font-bold" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {s.value}
                </p>
                <p className="text-xs mt-0.5 uppercase tracking-wider" style={{ color: "#3a5550" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Edit Profile button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="mt-4 w-full py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "#1db8a812", border: "1px solid #1db8a840", color: "#1db8a8" }}>
            ✏️ Edit Profile
          </button>

          {showEditModal && agentId && (
            <EditProfileModal
              numericId={agentId}
              currentMeta={meta}
              onClose={() => setShowEditModal(false)}
            />
          )}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#3a5550" }}>Loading...</p>
      )}
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ numericId, currentMeta, onClose }: {
  numericId: bigint;
  currentMeta: AgentMetadata;
  onClose: () => void;
}) {
  const [name, setName]               = useState(currentMeta.name ?? "");
  const [description, setDescription] = useState(currentMeta.description ?? "");
  const [agentUrl, setAgentUrl]       = useState(currentMeta.agentUrl ?? "");
  const [llmProvider, setLlmProvider] = useState(currentMeta.llmProvider ?? "");
  const [capabilities, setCapabilities] = useState((currentMeta.capabilities ?? []).join(", "));
  const [specialization, setSpec]     = useState(currentMeta.specialization ?? "");
  const [status, setStatus]           = useState<"idle"|"pending"|"done"|"error">("idle");
  const [errMsg, setErrMsg]           = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: waiting, isSuccess: done } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (done) { setStatus("done"); setTimeout(onClose, 1500); }
  }, [done, onClose]);

  const handleSave = () => {
    setStatus("pending");
    setErrMsg("");
    try {
      const newMeta: AgentMetadata = {
        ...currentMeta,
        name: name.trim() || currentMeta.name,
        description: description.trim() || undefined,
        agentUrl: agentUrl.trim() || undefined,
        llmProvider: llmProvider.trim() || undefined,
        specialization: specialization.trim() || undefined,
        capabilities: capabilities.split(",").map(c => c.trim()).filter(Boolean),
      };
      const metaURI = metadataToDataURI(newMeta);
      writeContract({
        address: ADDRESSES.AgentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "updateMetadata",
        args: [numericId, metaURI],
      });
    } catch (e) {
      setErrMsg((e as Error).message);
      setStatus("error");
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: "10px", fontSize: "0.85rem",
    background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ background: "#0d1c18", border: "1px solid #1db8a8" }}
        onClick={e => e.stopPropagation()}>

        <h2 className="text-sm font-bold uppercase tracking-wider mb-5"
          style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
          Edit Agent Profile
        </h2>

        <div className="space-y-3">
          {[
            { label: "Name", value: name, set: setName, placeholder: "Agent name" },
            { label: "Description", value: description, set: setDescription, placeholder: "What does your agent do?" },
            { label: "Agent URL", value: agentUrl, set: setAgentUrl, placeholder: "https://your-agent.railway.app" },
            { label: "LLM Provider", value: llmProvider, set: setLlmProvider, placeholder: "anthropic / openai / groq" },
            { label: "Specialization", value: specialization, set: setSpec, placeholder: "research / coding / trading…" },
            { label: "Capabilities", value: capabilities, set: setCapabilities, placeholder: "text generation, websearch, …" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="text-xs mb-1 block" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                {label}
              </label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={inputStyle} />
            </div>
          ))}
        </div>

        <p className="text-xs mt-3 mb-4" style={{ color: "#3a5550" }}>
          Metadata stored as data: URI on-chain. Callable only by your registered wallet.
        </p>

        {errMsg && <p className="text-xs mb-3" style={{ color: "#e63030" }}>{errMsg}</p>}
        {status === "done" && <p className="text-xs mb-3" style={{ color: "#3ec95a" }}>✅ Profile updated!</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
            style={{ background: "#1a2e2b", color: "#5a807a", border: "1px solid #1a2e2b" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isPending || waiting}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: isPending || waiting ? "#1db8a830" : "#1db8a8", color: "#060c0b" }}>
            {isPending ? "Signing…" : waiting ? "Confirming…" : "Save On-Chain"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── V3 Tasks Section ─────────────────────────────────────────────────────────

function MyV3Tasks({ address }: { address: string }) {
  const { data: taskCount } = useReadContract({
    address: ADDRESSES.MoltForgeEscrowV3,
    abi: ESCROW_V3_ABI,
    functionName: "taskCount",
  });

  const count = Number(taskCount ?? 0);
  const batchEnd = Math.min(count, 50);

  const { data: tasksRaw } = useReadContract({
    address: ADDRESSES.MoltForgeEscrowV3,
    abi: ESCROW_V3_ABI,
    functionName: "getTasksBatch",
    args: count > 0 ? [1n, BigInt(batchEnd)] : undefined,
    query: { enabled: count > 0 },
  });

  const { clientTasks, agentTasks } = useMemo(() => {
    if (!tasksRaw) return { clientTasks: [] as V3Task[], agentTasks: [] as V3Task[] };
    const all = (tasksRaw as V3Task[]).filter(t => t.id > 0n);
    const addr = address.toLowerCase();
    return {
      clientTasks: all.filter(t => t.client.toLowerCase() === addr).sort((a, b) => Number(b.id) - Number(a.id)),
      agentTasks: all.filter(t => t.claimedBy.toLowerCase() === addr).sort((a, b) => Number(b.id) - Number(a.id)),
    };
  }, [tasksRaw, address]);

  const hasAny = clientTasks.length > 0 || agentTasks.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
          My Tasks (V3)
        </h2>
        <Link href="/create-task"
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "#f0782815", border: "1px solid #f0782840", color: "#f07828" }}>
          + New Task
        </Link>
      </div>

      {!hasAny ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: "#0a1a17", border: "1px dashed #1a2e2b" }}>
          <p className="text-sm mb-3" style={{ color: "#3a5550" }}>No V3 tasks yet</p>
          <Link href="/create-task" className="text-sm" style={{ color: "#1db8a8" }}>
            Create your first task →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Client tasks */}
          {clientTasks.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                Tasks I Created ({clientTasks.length})
              </h3>
              <div className="space-y-4">
                {clientTasks.map(t => (
                  <V3TaskItem key={t.id.toString()} task={t} role="client" />
                ))}
              </div>
            </div>
          )}

          {/* Agent tasks */}
          {agentTasks.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                Tasks I Claimed ({agentTasks.length})
              </h3>
              <div className="space-y-4">
                {agentTasks.map(t => (
                  <V3TaskItem key={t.id.toString()} task={t} role="agent" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Legacy V1 Tasks ──────────────────────────────────────────────────────────

function MyLegacyTasks({ address }: { address: string }) {
  const { data: taskCount } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "taskCount",
  });

  const count = Number(taskCount ?? 0);
  if (count === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-5"
        style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
        Legacy Tasks (V1)
      </h2>
      <div className="space-y-4">
        {Array.from({ length: count }, (_, i) => count - i).map(id => (
          <TaskItem key={id} taskId={id} address={address} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4"
          style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.04em" }}>
          Dashboard
        </h1>
        <p style={{ color: "#3a5550" }}>Connect your wallet to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8"
        style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)", letterSpacing: "-0.04em" }}>
        Dashboard
      </h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <AgentProfile address={address} />
        </div>
        <div className="lg:col-span-2">
          <MyV3Tasks address={address} />
          <MyLegacyTasks address={address} />
        </div>
      </div>
    </div>
  );
}
