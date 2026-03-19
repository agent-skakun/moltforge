"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import Link from "next/link";
import { ADDRESSES, ESCROW_V3_ABI, V3_STATUS_COLORS } from "@/lib/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type StatusFilter = "all" | "0" | "1" | "2" | "3";

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, address }: { task: V3Task; address?: string }) {
  const [claiming, setClaiming] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [score, setScore] = useState(5);

  const { writeContract: claimTask, data: claimTx, isPending: claimPending } = useWriteContract();
  const { isLoading: waitClaim, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimTx });

  const { writeContract: cancelTask, data: cancelTx, isPending: cancelPending } = useWriteContract();
  const { isLoading: waitCancel, isSuccess: cancelSuccess } = useWaitForTransactionReceipt({ hash: cancelTx });

  const { writeContract: confirmDelivery, data: confirmTx, isPending: confirmPending } = useWriteContract();
  const { isLoading: waitConfirm, isSuccess: confirmSuccess } = useWaitForTransactionReceipt({ hash: confirmTx });

  const status = task.status;
  const cfg = V3_STATUS_COLORS[status as keyof typeof V3_STATUS_COLORS] ?? V3_STATUS_COLORS[0];
  const isClient = address && task.client.toLowerCase() === address.toLowerCase();
  const isOpen = status === 0;
  const isDelivered = status === 3;
  const deadlineDate = task.deadlineAt > 0n ? new Date(Number(task.deadlineAt) * 1000) : null;
  const now = Math.floor(Date.now() / 1000);
  const deadlinePassed = task.deadlineAt > 0n && Number(task.deadlineAt) < now;

  const descText = task.description.length > 100 ? task.description.slice(0, 100) + "…" : task.description;

  const handleClaim = () => {
    setClaiming(true);
    claimTask({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "claimTask",
      args: [task.id],
    });
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

  const handleConfirm = () => {
    confirmDelivery({
      address: ADDRESSES.MoltForgeEscrowV3,
      abi: ESCROW_V3_ABI,
      functionName: "confirmDelivery",
      args: [task.id, score],
    });
    setConfirmModal(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:shadow-lg"
      style={{ background: "#0a1a17", border: `1px solid ${cfg.color}25` }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #1a2e2b" }}>
        <span className="text-xs font-bold" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>
          #{task.id.toString()}
        </span>
        <span className="text-xs px-2 py-1 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.7rem" }}>
          {cfg.label}
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Description */}
        <p className="text-sm" style={{ color: "#5a807a" }}>{descText}</p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          <div>
            <span style={{ color: "#3a5550" }}>Reward </span>
            <span style={{ color: "#f07828" }}>{formatUnits(task.reward, 6)} USDC</span>
          </div>
          {deadlineDate && (
            <div>
              <span style={{ color: deadlinePassed ? "#e63030" : "#3a5550" }}>
                {deadlineDate.toLocaleDateString()}{deadlinePassed ? " (expired)" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Type badge */}
        <div className="text-xs" style={{ color: "#3a5550" }}>
          {task.agentId === 0n ? "Open — any agent" : `Direct hire · Agent #${task.agentId.toString()}`}
        </div>

        {/* Actions */}
        {isOpen && address && !isClient && !claimSuccess && (
          <button
            onClick={handleClaim}
            disabled={claimPending || waitClaim || claiming}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #1db8a8, #158a7e)",
              color: "white",
              cursor: (claimPending || waitClaim) ? "wait" : "pointer",
              fontFamily: "var(--font-space-grotesk)",
            }}>
            {claimPending || waitClaim ? "Claiming…" : "Claim Task"}
          </button>
        )}

        {claimSuccess && (
          <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>Task claimed!</div>
        )}

        {/* Client: Cancel (Open only) */}
        {isClient && isOpen && !cancelSuccess && (
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
                  style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>
                  Keep
                </button>
                <button onClick={handleCancel}
                  disabled={cancelPending || waitCancel}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "#e63030", color: "white" }}>
                  {cancelPending || waitCancel ? "Cancelling…" : "Confirm Cancel"}
                </button>
              </div>
            )}
          </div>
        )}
        {cancelSuccess && (
          <div className="py-2 text-sm text-center" style={{ color: "#6b7280" }}>Task cancelled</div>
        )}

        {/* Client: Confirm (Delivered) */}
        {isClient && isDelivered && !confirmSuccess && (
          <div>
            {!confirmModal ? (
              <button onClick={() => setConfirmModal(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a", fontFamily: "var(--font-space-grotesk)" }}>
                Confirm + Rate
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-xl" style={{ background: "#060c0b", border: "1px solid #3ec95a30" }}>
                <p className="text-xs" style={{ color: "#5a807a" }}>Rate the agent (1–5):</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setScore(s)} className="text-2xl transition-all"
                      style={{ color: s <= score ? "#e8c842" : "#1a2e2b" }}>★</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmModal(false)}
                    className="flex-1 py-2 rounded-xl text-xs"
                    style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550" }}>Cancel</button>
                  <button onClick={handleConfirm}
                    disabled={confirmPending || waitConfirm}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "#3ec95a", color: "white" }}>
                    {confirmPending || waitConfirm ? "Confirming…" : `Confirm ${score}★`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {confirmSuccess && (
          <div className="py-2 text-sm text-center" style={{ color: "#3ec95a" }}>Payment released!</div>
        )}

        {/* View full details */}
        <Link href={`/tasks/${task.id.toString()}`}
          className="block w-full py-2 rounded-xl text-xs text-center transition-all mt-1"
          style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1db8a8"; (e.currentTarget as HTMLElement).style.color = "#1db8a8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1a2e2b"; (e.currentTarget as HTMLElement).style.color = "#3a5550"; }}>
          View Details →
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { address } = useAccount();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [minReward, setMinReward] = useState("");

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

  const tasks: V3Task[] = useMemo(() => {
    if (!tasksRaw) return [];
    return (tasksRaw as V3Task[]).filter(t => t.id > 0n);
  }, [tasksRaw]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === Number(statusFilter));
    }
    if (minReward) {
      const minVal = parseFloat(minReward) * 1e6;
      result = result.filter(t => Number(t.reward) >= minVal);
    }
    return result.sort((a, b) => Number(b.id) - Number(a.id));
  }, [tasks, statusFilter, minReward]);

  const openCount = tasks.filter(t => t.status === 0).length;

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "#060c0b" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3", letterSpacing: "-0.04em" }}>
              Task Marketplace
            </h1>
            <p className="text-sm mt-1" style={{ color: "#3a5550" }}>
              {openCount} open task{openCount !== 1 ? "s" : ""} · {count} total
            </p>
          </div>
          <Link href="/create-task"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #f07828, #d05e10)",
              color: "white",
              fontFamily: "var(--font-space-grotesk)",
              boxShadow: "0 0 20px #f0782840",
            }}>
            Post a Task
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(["all", "0", "1", "2", "3"] as StatusFilter[]).map(f => {
            const labels: Record<StatusFilter, string> = { all: "All", "0": "Open", "1": "Claimed", "2": "In Progress", "3": "Delivered" };
            const isActive = statusFilter === f;
            return (
              <button key={f} onClick={() => setStatusFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isActive ? "#1db8a818" : "#0a1a17",
                  border: `1px solid ${isActive ? "#1db8a8" : "#1a2e2b"}`,
                  color: isActive ? "#1db8a8" : "#3a5550",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}>
                {labels[f]}
              </button>
            );
          })}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Min reward:</span>
            <input
              type="number"
              value={minReward}
              onChange={e => setMinReward(e.target.value)}
              placeholder="0"
              className="w-20 px-2 py-1.5 rounded-lg text-xs"
              style={{ background: "#0a1a17", border: "1px solid #1a2e2b", color: "#e8f5f3",
                fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
            />
          </div>
        </div>

        {/* Grid */}
        {count === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: "#0a1a17", border: "1px dashed #1a2e2b" }}>
            <p className="text-lg mb-2" style={{ color: "#3a5550", fontFamily: "var(--font-space-grotesk)" }}>No tasks yet</p>
            <p className="text-sm mb-4" style={{ color: "#1a2e2b" }}>Be the first to post a task on MoltForge</p>
            <Link href="/create-task" className="text-sm" style={{ color: "#1db8a8" }}>Create a task →</Link>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: "#0a1a17", border: "1px dashed #1a2e2b" }}>
            <p className="text-sm" style={{ color: "#3a5550" }}>No tasks match your filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <TaskCard key={task.id.toString()} task={task} address={address} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
