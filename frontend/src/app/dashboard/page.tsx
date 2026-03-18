"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI, ESCROW_ABI, TIER_NAMES } from "@/lib/contracts";
import { AvatarFace, PRESETS, FaceParams } from "@/components/AvatarFace";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { label: "Open",       color: "#1db8a8", bg: "#1db8a812", icon: "🔵" },
  { label: "InProgress", color: "#f07828", bg: "#f0782812", icon: "🟡" },
  { label: "Delivered",  color: "#e8c842", bg: "#e8c84212", icon: "📬" },
  { label: "Completed",  color: "#3ec95a", bg: "#3ec95a12", icon: "✅" },
  { label: "Disputed",   color: "#e63030", bg: "#e6303012", icon: "⚠️" },
  { label: "Cancelled",  color: "#3a5550", bg: "#3a555012", icon: "⛔" },
];

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

// ─── Task Item ────────────────────────────────────────────────────────────────

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
  const isDelivered = status === 2; // Delivered
  const isOpen = status === 0;      // Open
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = task.deadlineAt > 0n && Number(task.deadlineAt) < now;
  const noAgent = !task.agent || task.agent === "0x0000000000000000000000000000000000000000";

  // Parse description
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

  // Parse delivery
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

      {/* Header */}
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
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem" }}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Description */}
        {taskDesc && (
          <p className="text-sm" style={{ color: "#5a807a" }}>
            {taskDesc.slice(0, 200)}{taskDesc.length > 200 ? "..." : ""}
          </p>
        )}

        {/* Meta */}
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

        {/* Delivery result */}
        {deliveryText && (
          <div className="p-3 rounded-xl text-xs"
            style={{ background: "#060c0b", border: "1px solid #1db8a820",
              color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)", maxHeight: 80, overflowY: "auto" }}>
            <span style={{ color: "#1db8a8" }}>Delivery: </span>{deliveryText}
          </div>
        )}

        {/* Confirm+Rate (client, Delivered) */}
        {isClient && isDelivered && !confirmed && (
          <div>
            {!showRating ? (
              <button
                onClick={() => setShowRating(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a",
                  fontFamily: "var(--font-space-grotesk)" }}>
                ✅ Confirm + Rate
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl" style={{ background: "#060c0b", border: "1px solid #3ec95a30" }}>
                <p className="text-xs" style={{ color: "#5a807a" }}>Rate the agent (1–5 stars):</p>
                <StarRating value={rating} onChange={setRating} />
                <div className="flex gap-2">
                  <button onClick={() => setShowRating(false)}
                    className="flex-1 py-2 rounded-xl text-xs transition-all"
                    style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming || waitConfirm}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: "#3ec95a", color: "white",
                      cursor: (confirming || waitConfirm) ? "wait" : "pointer" }}>
                    {confirming || waitConfirm ? "Confirming..." : `Confirm ${rating}★`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmed success */}
        {confirmed && (
          <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>
            ✅ Payment released · Merit awarded
          </div>
        )}

        {/* Cancel (client, Open, deadline passed or no agent) */}
        {isClient && isOpen && (deadlinePassed || noAgent) && !cancelled && (
          <div>
            {!cancelConfirm ? (
              <button onClick={() => setCancelConfirm(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#e6303018", border: "1px solid #e63030", color: "#e63030" }}>
                ⛔ Cancel Task
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setCancelConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs"
                  style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>
                  Keep
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling || waitCancel}
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

  function parseMetadata(uri: string): { name?: string; specialization?: string } {
    try {
      if (uri?.startsWith("data:application/json")) {
        return JSON.parse(atob(uri.split(",")[1]));
      }
    } catch { /* ignore */ }
    return {};
  }

  const meta = agent ? parseMetadata(agent.metadataURI) : {};
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
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#3a5550" }}>Loading...</p>
      )}
    </div>
  );
}

// ─── My Tasks ────────────────────────────────────────────────────────────────

function MyTasks({ address }: { address: string }) {
  const { data: taskCount } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "taskCount",
  });

  const count = Number(taskCount ?? 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
          My Tasks
        </h2>
        <Link href="/create-task"
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: "#f0782815", border: "1px solid #f0782840", color: "#f07828" }}>
          + New Task
        </Link>
      </div>

      {count === 0 ? (
        <div className="text-center py-12 rounded-2xl"
          style={{ background: "#0a1a17", border: "1px dashed #1a2e2b" }}>
          <p className="text-sm mb-3" style={{ color: "#3a5550" }}>No tasks yet</p>
          <Link href="/create-task"
            className="text-sm" style={{ color: "#1db8a8" }}>
            Create your first task →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: count }, (_, i) => count - i).map(id => (
            <TaskItem key={id} taskId={id} address={address} />
          ))}
        </div>
      )}
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
          <MyTasks address={address} />
        </div>
      </div>
    </div>
  );
}
