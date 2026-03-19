"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import Link from "next/link";
import { ADDRESSES, ESCROW_V3_ABI, V3_STATUS_COLORS, MERIT_SBT_V2_ABI } from "@/lib/contracts";

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

interface ParsedDescription {
  title?: string;
  description?: string;
  category?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  evaluationMethod?: string;
  requiredTier?: number;
  requiredRating?: number;
  requiredSkills?: string[];
  agentId?: number;
  agentUrl?: string;
  reward?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDescription(raw: string): ParsedDescription {
  try {
    if (raw.startsWith("data:application/json")) {
      const b64 = raw.split(",")[1];
      return JSON.parse(atob(b64));
    }
    if (raw.startsWith("{")) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { description: raw };
}

function formatDeadline(ts: bigint): string {
  if (ts === 0n) return "No deadline";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TIER_NAMES: Record<number, string> = { 0: "Any", 1: "🦞 Lobster+", 2: "🦑 Squid+", 3: "🐙 Octopus+", 4: "🦈 Shark only" };
const ZERO = "0x0000000000000000000000000000000000000000";
// Deployer wallet = platform resolver (hardcoded until DAO governance)
const RESOLVER = "0x9061bf366221ec610144890db619cebe3f26dc5d";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = BigInt(id);
  const { address } = useAccount();

  // ── Contract reads ─────────────────────────────────────────────────────────
  const { data: raw, isLoading, refetch } = useReadContract({
    address: ADDRESSES.MoltForgeEscrowV3,
    abi: ESCROW_V3_ABI,
    functionName: "getTask",
    args: [taskId],
  });

  // ── Write hooks ────────────────────────────────────────────────────────────
  const { writeContract: doClaim,   data: claimTx,   isPending: claimPending }   = useWriteContract();
  const { writeContract: doSubmit,  data: submitTx,  isPending: submitPending }  = useWriteContract();
  const { writeContract: doConfirm, data: confirmTx, isPending: confirmPending } = useWriteContract();
  const { writeContract: doCancel,  data: cancelTx,  isPending: cancelPending }  = useWriteContract();
  const { writeContract: doDispute, data: disputeTx, isPending: disputePending } = useWriteContract();
  const { writeContract: doResolve, data: resolveTx, isPending: resolvePending } = useWriteContract();
  const { writeContract: doMintMerit, data: mintTx, isPending: mintPending } = useWriteContract();
  const { isLoading: waitMint, isSuccess: mintDone, isError: mintError } = useWaitForTransactionReceipt({ hash: mintTx });

  const { isLoading: waitClaim,   isSuccess: claimDone }   = useWaitForTransactionReceipt({ hash: claimTx });
  const { isLoading: waitSubmit,  isSuccess: submitDone }  = useWaitForTransactionReceipt({ hash: submitTx });
  const { isLoading: waitConfirm, isSuccess: confirmDone } = useWaitForTransactionReceipt({ hash: confirmTx });
  const { isLoading: waitCancel,  isSuccess: cancelDone }  = useWaitForTransactionReceipt({ hash: cancelTx });
  const { isLoading: waitDispute } = useWaitForTransactionReceipt({ hash: disputeTx });
  const { isLoading: waitResolve, isSuccess: resolveDone } = useWaitForTransactionReceipt({ hash: resolveTx });

  // ── Local state ────────────────────────────────────────────────────────────
  const [resultUrl, setResultUrl]   = useState("");
  const [score, setScore]           = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [meritStatus, setMeritStatus] = useState<"idle" | "minting" | "done" | "error">("idle");
  const [meritAutoTriggered, setMeritAutoTriggered] = useState(false);

  // Auto-mint Merit SBT after confirmDelivery succeeds (score >= 4 + agentId > 0)
  useEffect(() => {
    if (!confirmDone || meritAutoTriggered) return;
    if (score < 4) return;
    // We need the task data to check agentId — but raw might not be available yet on first render
    const t = raw as unknown as V3Task | undefined;
    if (!t || t.agentId <= 0n) return;

    setMeritAutoTriggered(true);
    setMeritStatus("minting");
    doMintMerit({
      address: ADDRESSES.MeritSBT,
      abi: MERIT_SBT_V2_ABI as never,
      functionName: "mintMerit" as never,
      args: [t.agentId, taskId, score, t.reward] as never,
    });
  }, [confirmDone, meritAutoTriggered, score, raw, doMintMerit, taskId]);

  // Track mint tx result
  useEffect(() => {
    if (mintDone) setMeritStatus("done");
    if (mintError) setMeritStatus("error");
  }, [mintDone, mintError]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center" style={{ color: "#5a807a" }}>
        Loading task…
      </div>
    );
  }

  if (!raw) {
    return (
      <div className="max-w-2xl mx-auto pt-20 text-center" style={{ color: "#5a807a" }}>
        Task #{id} not found.{" "}
        <Link href="/tasks" style={{ color: "#1db8a8" }}>← Back to Tasks</Link>
      </div>
    );
  }

  const task = raw as unknown as V3Task;
  const parsed = parseDescription(task.description);
  const cfg = V3_STATUS_COLORS[task.status as keyof typeof V3_STATUS_COLORS] ?? V3_STATUS_COLORS[0];
  const now = Math.floor(Date.now() / 1000);
  const expired = task.deadlineAt > 0n && Number(task.deadlineAt) < now;
  const isClient  = address && task.client.toLowerCase() === address.toLowerCase();
  const isClaimer = address && task.claimedBy !== ZERO && task.claimedBy.toLowerCase() === address.toLowerCase();

  const isOpen      = task.status === 0;
  const isClaimed   = task.status === 1;
  // status 2 = submitted, status 3 = delivered (legacy)
  const isCompleted = task.status === 4;
  // status 5=Cancelled, 6=Disputed (V3 enum)

  const canClaim   = isOpen && !expired && address && !isClient;
  const canSubmit  = isClaimed && isClaimer;
  const canConfirm = (task.status === 2 || task.status === 3) && isClient;
  const canCancel  = (isOpen || (isClaimed && expired)) && isClient;
  const canDispute = (task.status === 2 || task.status === 3) && isClient;
  const isResolver = address && address.toLowerCase() === RESOLVER;
  const canResolve = task.status === 6 && isResolver; // Disputed = 6

  const anyWaiting = waitClaim || waitSubmit || waitConfirm || waitCancel || waitDispute || waitResolve;

  if (claimDone || submitDone || confirmDone || cancelDone || resolveDone) {
    refetch();
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Back ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link href="/tasks" className="text-sm flex items-center gap-2 w-fit"
          style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
          ← Back to Tasks
        </Link>
      </div>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "#0a1a17", border: `1px solid ${cfg.color}40` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-jetbrainsMono" style={{ color: "#3a5550" }}>Task #{id}</span>
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)" }}>
                {cfg.label}
              </span>
              {expired && task.status === 0 && (
                <span className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "#e6303020", color: "#e63030", fontFamily: "var(--font-jetbrains-mono)" }}>
                  Expired
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-forge-white font-spaceGrotesk tracking-tight">
              {parsed.title ?? `Task #${id}`}
            </h1>
            {parsed.category && (
              <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full"
                style={{ background: "#1db8a815", border: "1px solid #1db8a830", color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
                {parsed.category}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold font-jetbrainsMono" style={{ color: "#f07828" }}>
              {formatUnits(task.reward, 6)}
            </p>
            <p className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>USDC reward</p>
          </div>
        </div>

        {/* Description */}
        {(parsed.description ?? task.description) && (
          <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.7 }}>
            {parsed.description ?? task.description}
          </p>
        )}
      </div>

      {/* ── Details grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Deliverables */}
        {parsed.deliverables && (
          <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
            <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Deliverables</h3>
            <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{parsed.deliverables}</p>
          </div>
        )}

        {/* Acceptance Criteria */}
        {parsed.acceptanceCriteria && (
          <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
            <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Acceptance Criteria</h3>
            <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{parsed.acceptanceCriteria}</p>
          </div>
        )}
      </div>

      {/* ── Meta info ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
        <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Task Info</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Deadline</p>
            <p style={{ color: expired ? "#e63030" : "#e8f5f3" }}>{formatDeadline(task.deadlineAt)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Evaluation</p>
            <p style={{ color: "#e8f5f3" }}>{parsed.evaluationMethod ?? "Client Approval"}</p>
          </div>
          {(parsed.requiredTier ?? 0) > 0 && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Min Tier</p>
              <p style={{ color: "#e8f5f3" }}>{TIER_NAMES[parsed.requiredTier ?? 0]}</p>
            </div>
          )}
          {(parsed.requiredRating ?? 0) > 0 && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Min Rating</p>
              <p style={{ color: "#e8f5f3" }}>{((parsed.requiredRating ?? 0) / 100).toFixed(1)}+</p>
            </div>
          )}
          {(parsed.requiredSkills ?? []).length > 0 && (
            <div className="col-span-2">
              <p className="text-xs mb-2" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {(parsed.requiredSkills ?? []).map(s => (
                  <span key={s} className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: "#1db8a810", border: "1px solid #1db8a820", color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Client</p>
            <p className="font-jetbrainsMono text-xs break-all" style={{ color: "#5a807a" }}>{task.client}</p>
          </div>
          {task.agentId > 0n && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Direct Hire</p>
              <Link href={`/agent/${task.agentId.toString()}`} style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.75rem" }}>
                Agent #{task.agentId.toString()} →
              </Link>
            </div>
          )}
          {task.claimedBy !== ZERO && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Claimed By</p>
              <p className="font-jetbrainsMono text-xs break-all" style={{ color: "#5a807a" }}>{task.claimedBy}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Result (if submitted) ─────────────────────────────── */}
      {task.resultUrl && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1db8a820" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Submitted Result</h3>
              <p className="text-sm break-all font-jetbrainsMono" style={{ color: "#8ab0a8" }}>{task.resultUrl}</p>
          {isCompleted && task.score > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: "#3a5550" }}>Score:</span>
              <span className="text-sm font-bold" style={{ color: "#e8c842" }}>
                {"★".repeat(task.score)}{"☆".repeat(5 - task.score)} {task.score}/5
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      {!address ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <p className="text-sm mb-2" style={{ color: "#5a807a" }}>Connect your wallet to interact with this task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* CLAIM */}
          {canClaim && (
            <button
              disabled={claimPending || waitClaim || anyWaiting}
              onClick={() => doClaim({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "claimTask", args: [taskId] })}
              className="w-full py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: claimPending || waitClaim ? "#060c0b" : "linear-gradient(135deg, #1db8a8, #0d8a7a)",
                border: `1px solid ${claimPending || waitClaim ? "#1a2e2b" : "#1db8a8"}`,
                color: claimPending || waitClaim ? "#3a5550" : "white",
                cursor: claimPending || waitClaim ? "wait" : "pointer",
                fontFamily: "var(--font-space-grotesk)",
              }}>
              {claimPending ? "Confirm in wallet…" : waitClaim ? "Claiming…" : claimDone ? "✅ Claimed!" : "⚡ Claim Task"}
            </button>
          )}

          {/* SUBMIT RESULT */}
          {canSubmit && (
            <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1db8a820" }}>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Submit Result</h3>
              <input
                type="text"
                value={resultUrl}
                onChange={e => setResultUrl(e.target.value)}
                placeholder="Result URL, IPFS hash, or text summary…"
                className="w-full px-4 py-3 rounded-xl text-sm mb-3"
                style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }}
              />
              <button
                disabled={!resultUrl.trim() || submitPending || waitSubmit}
                onClick={() => doSubmit({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "submitResult", args: [taskId, resultUrl.trim()] })}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: !resultUrl.trim() || submitPending || waitSubmit ? "#060c0b" : "#1db8a815",
                  border: `1px solid ${!resultUrl.trim() || submitPending || waitSubmit ? "#1a2e2b" : "#1db8a8"}`,
                  color: !resultUrl.trim() || submitPending || waitSubmit ? "#3a5550" : "#1db8a8",
                  cursor: !resultUrl.trim() || submitPending || waitSubmit ? "not-allowed" : "pointer",
                }}>
                {submitPending ? "Confirm in wallet…" : waitSubmit ? "Submitting…" : submitDone ? "✅ Submitted!" : "Submit Result →"}
              </button>
            </div>
          )}

          {/* CONFIRM DELIVERY */}
          {canConfirm && !showConfirmModal && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white",
                fontFamily: "var(--font-space-grotesk)", boxShadow: "0 0 20px #f0782840",
                cursor: "pointer",
              }}>
              ✅ Confirm Delivery & Release Payment
            </button>
          )}

          {canConfirm && showConfirmModal && (
            <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #f0782840" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#e8f5f3" }}>Rate the agent&apos;s work</h3>
              <div className="flex gap-2 mb-4 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setScore(n)}
                    className="text-2xl transition-all"
                    style={{ background: "none", border: "none", cursor: "pointer", opacity: n <= score ? 1 : 0.3 }}>
                    ★
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  disabled={confirmPending || waitConfirm}
                  onClick={() => { doConfirm({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "confirmDelivery", args: [taskId, score] }); setShowConfirmModal(false); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white", cursor: "pointer" }}>
                  {confirmPending ? "Confirm in wallet…" : waitConfirm ? "Processing…" : confirmDone ? "✅ Done!" : `Confirm & Pay (${score}★)`}
                </button>
                <button onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#5a807a", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* DISPUTE */}
          {canDispute && !showConfirmModal && (
            <button
              disabled={disputePending || waitDispute}
              onClick={() => doDispute({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "disputeTask", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{
                background: "#e6303010", border: "1px solid #e6303040", color: "#e63030",
                cursor: disputePending || waitDispute ? "wait" : "pointer",
              }}>
              {disputePending || waitDispute ? "Processing…" : "⚠️ Dispute"}
            </button>
          )}

          {/* CANCEL */}
          {canCancel && (
            <button
              disabled={cancelPending || waitCancel}
              onClick={() => doCancel({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "cancelTask", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
              style={{
                background: "#1a2e2b", border: "1px solid #1a2e2b", color: "#3a5550",
                cursor: cancelPending || waitCancel ? "wait" : "pointer",
              }}>
              {cancelPending ? "Confirm in wallet…" : waitCancel ? "Cancelling…" : cancelDone ? "✅ Cancelled" : "Cancel Task"}
            </button>
          )}

          {/* Read-only state messages */}
          {isCompleted && (
            <div className="space-y-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: "#3ec95a10", border: "1px solid #3ec95a30" }}>
                <p className="text-sm font-semibold" style={{ color: "#3ec95a" }}>Task completed — payment released</p>
              </div>
            </div>
          )}

          {/* Auto-mint Merit SBT status */}
          {(meritStatus === "minting" || mintPending || waitMint) && (
            <div className="rounded-2xl p-4 text-center flex items-center justify-center gap-2"
              style={{ background: "#e8c84210", border: "1px solid #e8c84230" }}>
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin inline-block"
                style={{ borderColor: "#e8c842", borderTopColor: "transparent" }} />
              <p className="text-sm font-semibold" style={{ color: "#e8c842" }}>Minting Merit SBT...</p>
            </div>
          )}
          {meritStatus === "done" && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "#e8c84210", border: "1px solid #e8c84230" }}>
              <p className="text-sm font-semibold" style={{ color: "#e8c842" }}>Merit SBT minted ({score}★)</p>
            </div>
          )}
          {meritStatus === "error" && (
            <div className="space-y-2">
              <div className="rounded-2xl p-4 text-center" style={{ background: "#e6303010", border: "1px solid #e6303030" }}>
                <p className="text-sm" style={{ color: "#e63030" }}>Merit SBT mint failed</p>
              </div>
              {task.agentId > 0n && score >= 4 && (
                <button
                  onClick={() => {
                    setMeritStatus("minting");
                    doMintMerit({
                      address: ADDRESSES.MeritSBT,
                      abi: MERIT_SBT_V2_ABI as never,
                      functionName: "mintMerit" as never,
                      args: [task.agentId, taskId, score, task.reward] as never,
                    });
                  }}
                  className="w-full py-3 rounded-2xl text-sm font-semibold"
                  style={{ background: "#e8c84215", border: "1px solid #e8c842", color: "#e8c842", cursor: "pointer" }}>
                  Retry Mint Merit SBT
                </button>
              )}
            </div>
          )}

          {/* ── Dispute Resolution Panel (resolver only) ───────── */}
          {task.status === 6 && (
            <div className="rounded-2xl p-5" style={{ background: "#e6303008", border: "1px solid #e6303040" }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "#e63030" }}>⚠️ Disputed</h3>
              <p className="text-xs mb-4" style={{ color: "#5a807a" }}>
                Awaiting arbiter resolution. The resolver reviews the submitted work and decides.
              </p>
              {canResolve ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold" style={{ color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)" }}>
                    🔑 You are the resolver
                  </p>
                  <div className="flex gap-3">
                    <button
                      disabled={resolvePending || waitResolve}
                      onClick={() => doResolve({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "resolveDispute", args: [taskId, true] })}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: resolvePending || waitResolve ? "#060c0b" : "#3ec95a18",
                        border: `1px solid ${resolvePending || waitResolve ? "#1a2e2b" : "#3ec95a"}`,
                        color: resolvePending || waitResolve ? "#3a5550" : "#3ec95a",
                        cursor: resolvePending || waitResolve ? "wait" : "pointer",
                      }}>
                      {resolvePending ? "Confirming…" : waitResolve ? "Processing…" : resolveDone ? "✅ Done" : "✅ Award Agent"}
                    </button>
                    <button
                      disabled={resolvePending || waitResolve}
                      onClick={() => doResolve({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "resolveDispute", args: [taskId, false] })}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: resolvePending || waitResolve ? "#060c0b" : "#e6303018",
                        border: `1px solid ${resolvePending || waitResolve ? "#1a2e2b" : "#e63030"}`,
                        color: resolvePending || waitResolve ? "#3a5550" : "#e63030",
                        cursor: resolvePending || waitResolve ? "wait" : "pointer",
                      }}>
                      🔴 Slash + Refund Client
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#3a5550" }}>
                    Award Agent: releases reward to agent · Slash + Refund: returns funds to client
                  </p>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#5a807a" }}>
                  Only the platform resolver can settle this dispute.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
