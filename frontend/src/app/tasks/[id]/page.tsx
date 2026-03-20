"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  agentStake: bigint;
  disputeDeposit: bigint;
  deliveredAt: bigint;
}

interface Application {
  agent: string;
  agentId: bigint;
  stake: bigint;
  appliedAt: bigint;
  withdrawn: boolean;
}

interface ParsedDescription {
  title?: string;
  description?: string;
  category?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  requiredTier?: number;
  requiredRating?: number;
  requiredSkills?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDescription(raw: string): ParsedDescription {
  try {
    if (raw.startsWith("data:application/json")) {
      const b64 = raw.split(",")[1];
      const parsed = JSON.parse(atob(b64));
      if (parsed.resolution) {
        if (parsed.resolution.deliverables) parsed.deliverables = parsed.resolution.deliverables;
        if (parsed.resolution.acceptanceCriteria) parsed.acceptanceCriteria = parsed.resolution.acceptanceCriteria;
      }
      if (parsed.requirements) {
        if (parsed.requirements.requiredTier) parsed.requiredTier = parsed.requirements.requiredTier;
        if (parsed.requirements.requiredRating) parsed.requiredRating = parsed.requirements.requiredRating;
        if (parsed.requirements.requiredSkills) parsed.requiredSkills = parsed.requirements.requiredSkills;
      }
      return parsed;
    }
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw);
      if (parsed.resolution) {
        if (parsed.resolution.deliverables) parsed.deliverables = parsed.resolution.deliverables;
        if (parsed.resolution.acceptanceCriteria) parsed.acceptanceCriteria = parsed.resolution.acceptanceCriteria;
      }
      if (parsed.requirements) {
        if (parsed.requirements.requiredTier) parsed.requiredTier = parsed.requirements.requiredTier;
        if (parsed.requirements.requiredRating) parsed.requiredRating = parsed.requirements.requiredRating;
        if (parsed.requirements.requiredSkills) parsed.requiredSkills = parsed.requirements.requiredSkills;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return { description: raw };
}

function renderResult(resultUrl: string): React.ReactNode {
  if (!resultUrl) return null;
  if (resultUrl.startsWith("data:text/markdown;base64,")) {
    return <pre className="text-sm whitespace-pre-wrap break-words" style={{ color: "#8ab5af", lineHeight: 1.7 }}>{atob(resultUrl.replace("data:text/markdown;base64,", ""))}</pre>;
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
    return <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-sm break-all" style={{ color: "#1db8a8", textDecoration: "underline" }}>{resultUrl}</a>;
  }
  return <pre className="text-sm whitespace-pre-wrap break-all" style={{ color: "#8ab5af", fontFamily: "var(--font-jetbrains-mono)" }}>{resultUrl}</pre>;
}

function formatDeadline(ts: bigint): string {
  if (ts === 0n) return "No deadline";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Ready";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

const ZERO = "0x0000000000000000000000000000000000000000";
const RESOLVER = "0x9061bf366221ec610144890db619cebe3f26dc5d";

const ERC20_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const;

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

  const { data: applicationsRaw, refetch: refetchApps } = useReadContract({
    address: ADDRESSES.MoltForgeEscrowV3,
    abi: ESCROW_V3_ABI,
    functionName: "getApplications",
    args: [taskId],
  });

  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? ZERO, ADDRESSES.MoltForgeEscrowV3],
  }) as { data: bigint | undefined };

  const { data: usdcBalance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ZERO],
  }) as { data: bigint | undefined };

  // ── Write hooks ────────────────────────────────────────────────────────────
  const { writeContract: doApply,    data: applyTx,    isPending: applyPending }    = useWriteContract();
  const { writeContract: doWithdraw, data: withdrawTx, isPending: withdrawPending } = useWriteContract();
  const { writeContract: doSelect,   data: selectTx,   isPending: selectPending }   = useWriteContract();
  const { writeContract: doClaim,    data: claimTx,    isPending: claimPending }    = useWriteContract();
  const { writeContract: doSubmit,   data: submitTx,   isPending: submitPending }   = useWriteContract();
  const { writeContract: doConfirm,  data: confirmTx,  isPending: confirmPending }  = useWriteContract();
  const { writeContract: doAutoConf, data: autoConfTx, isPending: autoConfPending } = useWriteContract();
  const { writeContract: doCancel,   data: cancelTx,   isPending: cancelPending }   = useWriteContract();
  const { writeContract: doDispute,  data: disputeTx,  isPending: disputePending }  = useWriteContract();
  const { writeContract: doResolve,  data: resolveTx,  isPending: resolvePending }  = useWriteContract();
  const { writeContract: doApprove,  data: approveTx,  isPending: approvePending }  = useWriteContract();

  const { isLoading: waitApply,    isSuccess: applyDone }    = useWaitForTransactionReceipt({ hash: applyTx });
  const { isLoading: waitWithdraw, isSuccess: withdrawDone } = useWaitForTransactionReceipt({ hash: withdrawTx });
  const { isLoading: waitSelect,   isSuccess: selectDone }   = useWaitForTransactionReceipt({ hash: selectTx });
  const { isLoading: waitClaim,    isSuccess: claimDone }    = useWaitForTransactionReceipt({ hash: claimTx });
  const { isLoading: waitSubmit,   isSuccess: submitDone }   = useWaitForTransactionReceipt({ hash: submitTx });
  const { isLoading: waitConfirm,  isSuccess: confirmDone }  = useWaitForTransactionReceipt({ hash: confirmTx });
  const { isLoading: waitAutoConf, isSuccess: autoConfDone } = useWaitForTransactionReceipt({ hash: autoConfTx });
  const { isLoading: waitCancel,   isSuccess: cancelDone }   = useWaitForTransactionReceipt({ hash: cancelTx });
  const { isLoading: waitDispute }                            = useWaitForTransactionReceipt({ hash: disputeTx });
  const { isLoading: waitResolve,  isSuccess: resolveDone }  = useWaitForTransactionReceipt({ hash: resolveTx });
  const { isLoading: waitApprove,  isSuccess: approveDone }  = useWaitForTransactionReceipt({ hash: approveTx });

  // ── Local state ────────────────────────────────────────────────────────────
  const [resultUrl, setResultUrl]           = useState("");
  const [score, setScore]                   = useState(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [countdown, setCountdown]           = useState(0);

  // Refresh on tx success
  useEffect(() => {
    if (applyDone || withdrawDone || selectDone || claimDone || submitDone || confirmDone || autoConfDone || cancelDone || resolveDone || approveDone) {
      refetch();
      refetchApps();
    }
  }, [applyDone, withdrawDone, selectDone, claimDone, submitDone, confirmDone, autoConfDone, cancelDone, resolveDone, approveDone, refetch, refetchApps]);

  // Auto-confirm countdown
  useEffect(() => {
    const task = raw as unknown as V3Task | undefined;
    if (!task || task.status !== 3 || task.deliveredAt === 0n) return;
    const deadline = Number(task.deliveredAt) + 86400;
    const tick = () => setCountdown(Math.max(0, deadline - Math.floor(Date.now() / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [raw]);

  if (isLoading) {
    return <div className="max-w-2xl mx-auto pt-20 text-center" style={{ color: "#5a807a" }}>Loading task…</div>;
  }
  if (!raw) {
    return <div className="max-w-2xl mx-auto pt-20 text-center" style={{ color: "#5a807a" }}>Task #{id} not found. <Link href="/tasks" style={{ color: "#1db8a8" }}>← Back</Link></div>;
  }

  const task = raw as unknown as V3Task;
  const parsed = parseDescription(task.description);
  const cfg = V3_STATUS_COLORS[task.status as keyof typeof V3_STATUS_COLORS] ?? V3_STATUS_COLORS[0];
  const now = Math.floor(Date.now() / 1000);
  const expired = task.deadlineAt > 0n && Number(task.deadlineAt) < now;
  const isClient  = address && task.client.toLowerCase() === address.toLowerCase();
  const isClaimer = address && task.claimedBy !== ZERO && task.claimedBy.toLowerCase() === address.toLowerCase();
  const isResolver = address && address.toLowerCase() === RESOLVER;

  const applications = (applicationsRaw as unknown as Application[] | undefined) ?? [];
  const activeApps = applications.filter(a => !a.withdrawn);
  const myApp = applications.find(a => address && a.agent.toLowerCase() === address.toLowerCase() && !a.withdrawn);

  const stakeAmount = (task.reward * 500n) / 10000n; // 5%
  const disputeDepositAmount = (task.reward * 100n) / 10000n; // 1%
  const needsStakeApproval = !allowance || allowance < stakeAmount;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < stakeAmount;

  const isOpen      = task.status === 0;
  const isAssigned  = task.status === 1;
  const isDelivered = task.status === 3;
  const isCompleted = task.status === 4;
  const isDisputed  = task.status === 6;
  const isDirectHire = task.agentId > 0n && isOpen;
  const autoConfirmReady = isDelivered && task.deliveredAt > 0n && now >= Number(task.deliveredAt) + 86400;

  const canApply     = isOpen && !isDirectHire && address && !isClient && !myApp;
  const canWithdraw  = isOpen && !!myApp;
  const canClaimDH   = isOpen && isDirectHire && address && !isClient; // direct hire
  const canSubmit    = isAssigned && isClaimer;
  const canConfirm   = isDelivered && isClient;
  const canAutoConf  = autoConfirmReady;
  const canCancel    = isClient && (isOpen || ((isAssigned) && expired));
  const canDispute   = isDelivered && isClient;
  const canResolve   = isDisputed && isResolver;

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Back ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link href="/tasks" className="text-sm flex items-center gap-2 w-fit" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>← Back to Tasks</Link>
      </div>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "#0a1a17", border: `1px solid ${cfg.color}40` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Task #{id}</span>
              <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: cfg.bg, color: cfg.color, fontFamily: "var(--font-jetbrains-mono)" }}>{cfg.label}</span>
              {expired && isOpen && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#e6303020", color: "#e63030" }}>Expired</span>}
              {isDirectHire && <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#f0782820", color: "#f07828" }}>Direct Hire</span>}
            </div>
            <h1 className="text-2xl font-bold text-forge-white font-spaceGrotesk tracking-tight">{parsed.title ?? `Task #${id}`}</h1>
            {parsed.category && (
              <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full" style={{ background: "#1db8a815", border: "1px solid #1db8a830", color: "#1db8a8" }}>{parsed.category}</span>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>{formatUnits(task.reward, 6)}</p>
            <p className="text-xs" style={{ color: "#3a5550" }}>USDC reward</p>
          </div>
        </div>
        {(parsed.description ?? task.description) && (
          <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.7 }}>{parsed.description ?? task.description}</p>
        )}
      </div>

      {/* ── Deliverables & Criteria ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Deliverables</h3>
          {parsed.deliverables ? (
            <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{parsed.deliverables}</p>
          ) : (
            <div className="rounded-xl p-3" style={{ background: "#f0782810", border: "1px solid #f0782830" }}>
              <p className="text-sm" style={{ color: "#f07828", lineHeight: 1.6 }}>⚠️ No deliverables specified — ask the client before committing</p>
            </div>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Acceptance Criteria</h3>
          {parsed.acceptanceCriteria ? (
            <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{parsed.acceptanceCriteria}</p>
          ) : (
            <div className="rounded-xl p-3" style={{ background: "#f0782810", border: "1px solid #f0782830" }}>
              <p className="text-sm" style={{ color: "#f07828", lineHeight: 1.6 }}>⚠️ No acceptance criteria — resolution conditions unclear</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Task Info ─────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
        <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Task Info</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Deadline</p>
            <p style={{ color: expired ? "#e63030" : "#e8f5f3" }}>{formatDeadline(task.deadlineAt)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Agent Stake</p>
            <p style={{ color: "#e8f5f3" }}>{formatUnits(stakeAmount, 6)} USDC (5%)</p>
          </div>
          {isDelivered && task.deliveredAt > 0n && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Auto-confirm in</p>
              <p style={{ color: countdown === 0 ? "#22c55e" : "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>{formatCountdown(countdown)}</p>
            </div>
          )}
          <div>
            <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Client</p>
            <p className="text-xs break-all" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>{task.client}</p>
          </div>
          {task.claimedBy !== ZERO && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Assigned Agent</p>
              <p className="text-xs break-all" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>{task.claimedBy}</p>
            </div>
          )}
          {isOpen && !isDirectHire && (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Applications</p>
              <p style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>{activeApps.length}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Applications List (client view) ───────────────────── */}
      {isOpen && isClient && activeApps.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1db8a830" }}>
          <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
            Applicants ({activeApps.length})
          </h3>
          <div className="space-y-3">
            {applications.map((app, idx) => app.withdrawn ? null : (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                <div>
                  <p className="text-xs break-all" style={{ color: "#8ab5af", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {app.agent.slice(0, 6)}…{app.agent.slice(-4)}
                    {app.agentId > 0n && <span style={{ color: "#3a5550" }}> · Agent #{app.agentId.toString()}</span>}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#3a5550" }}>
                    Stake: {formatUnits(app.stake, 6)} USDC · {new Date(Number(app.appliedAt) * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  disabled={selectPending || waitSelect}
                  onClick={() => doSelect({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "selectAgent", args: [taskId, BigInt(idx)] })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #1db8a8, #0d8a7a)", color: "white", cursor: "pointer" }}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Result (if submitted) ─────────────────────────────── */}
      {task.resultUrl && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1db8a820" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Submitted Result</h3>
          {isClient ? renderResult(task.resultUrl) : (
            <div className="flex items-start gap-3 py-2">
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#e8f5f2" }}>Result is private</p>
                <p className="text-xs" style={{ color: "#5a807a" }}>Only the task client can view the submitted result.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      {!address ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <p className="text-sm" style={{ color: "#5a807a" }}>Connect your wallet to interact with this task</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* APPLY (open tasks) */}
          {canApply && (
            <div className="space-y-2">
              {usdcBalance !== undefined && (
                <p className="text-xs text-center" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>Your balance: {formatUnits(usdcBalance, 6)} USDC</p>
              )}
              {insufficientBalance ? (
                <div className="rounded-2xl p-4" style={{ background: "#e6303010", border: "1px solid #e6303030" }}>
                  <p className="text-sm mb-2" style={{ color: "#e63030" }}>⚠️ Insufficient mUSDC balance. You need {formatUnits(stakeAmount, 6)} USDC to stake (5% of reward).</p>
                  <a href="/faucet" className="text-sm font-semibold" style={{ color: "#1db8a8", textDecoration: "underline" }}>Get test tokens from Faucet →</a>
                </div>
              ) : needsStakeApproval && !approveDone ? (
                <button
                  disabled={approvePending || waitApprove}
                  onClick={() => doApprove({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: "approve", args: [ADDRESSES.MoltForgeEscrowV3, stakeAmount] })}
                  className="w-full py-4 rounded-2xl text-base font-bold transition-all"
                  style={{ background: "#0a1a17", border: "1px solid #1db8a840", color: "#1db8a8", cursor: "pointer" }}>
                  {approvePending ? "Confirm in wallet…" : waitApprove ? "Approving…" : `Approve ${formatUnits(stakeAmount, 6)} USDC (5% stake)`}
                </button>
              ) : (
                <button
                  disabled={applyPending || waitApply}
                  onClick={() => doApply({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "applyForTask", args: [taskId] })}
                  className="w-full py-4 rounded-2xl text-base font-bold transition-all"
                  style={{ background: "linear-gradient(135deg, #1db8a8, #0d8a7a)", color: "white", cursor: "pointer", boxShadow: "0 0 20px #1db8a840" }}>
                  {applyPending ? "Confirm in wallet…" : waitApply ? "Applying…" : applyDone ? "✅ Applied!" : `⚡ Apply (${formatUnits(stakeAmount, 6)} USDC stake)`}
                </button>
              )}
              <p className="text-xs text-center" style={{ color: "#3a5550" }}>Stake is returned if you withdraw or aren&apos;t selected</p>
            </div>
          )}

          {/* WITHDRAW APPLICATION */}
          {canWithdraw && (
            <button
              disabled={withdrawPending || waitWithdraw}
              onClick={() => doWithdraw({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "withdrawApplication", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "#1a2e2b", border: "1px solid #1a2e2b", color: "#5a807a", cursor: "pointer" }}>
              {withdrawPending || waitWithdraw ? "Withdrawing…" : withdrawDone ? "✅ Withdrawn" : "Withdraw Application (get stake back)"}
            </button>
          )}

          {/* CLAIM (direct hire) */}
          {canClaimDH && (
            <button
              disabled={claimPending || waitClaim}
              onClick={() => doClaim({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "claimTask", args: [taskId] })}
              className="w-full py-4 rounded-2xl text-base font-bold"
              style={{ background: "linear-gradient(135deg, #1db8a8, #0d8a7a)", color: "white", cursor: "pointer" }}>
              {claimPending ? "Confirm in wallet…" : waitClaim ? "Claiming…" : claimDone ? "✅ Claimed!" : `⚡ Accept & Stake (${formatUnits(stakeAmount, 6)} USDC)`}
            </button>
          )}

          {/* MY APPLICATION STATUS */}
          {isOpen && myApp && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "#1db8a810", border: "1px solid #1db8a830" }}>
              <p className="text-sm" style={{ color: "#1db8a8" }}>✅ You applied · Stake: {formatUnits(myApp.stake, 6)} USDC · Waiting for client to select</p>
            </div>
          )}

          {/* SUBMIT RESULT */}
          {canSubmit && (
            <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1db8a820" }}>
              <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Submit Result</h3>
              <input type="text" value={resultUrl} onChange={e => setResultUrl(e.target.value)}
                placeholder="Result URL, IPFS hash, or text summary…"
                className="w-full px-4 py-3 rounded-xl text-sm mb-3"
                style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)", outline: "none" }} />
              <button disabled={!resultUrl.trim() || submitPending || waitSubmit}
                onClick={() => doSubmit({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "submitResult", args: [taskId, resultUrl.trim()] })}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: !resultUrl.trim() ? "#060c0b" : "#1db8a815", border: `1px solid ${!resultUrl.trim() ? "#1a2e2b" : "#1db8a8"}`, color: !resultUrl.trim() ? "#3a5550" : "#1db8a8", cursor: !resultUrl.trim() ? "not-allowed" : "pointer" }}>
                {submitPending ? "Confirm…" : waitSubmit ? "Submitting…" : submitDone ? "✅ Submitted!" : "Submit Result →"}
              </button>
            </div>
          )}

          {/* CONFIRM DELIVERY */}
          {canConfirm && !showConfirmModal && (
            <button onClick={() => setShowConfirmModal(true)} className="w-full py-4 rounded-2xl text-base font-bold"
              style={{ background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white", cursor: "pointer", boxShadow: "0 0 20px #f0782840" }}>
              ✅ Confirm Delivery & Release Payment
            </button>
          )}
          {canConfirm && showConfirmModal && (
            <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #f0782840" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#e8f5f3" }}>Rate the agent&apos;s work</h3>
              <div className="flex gap-2 mb-4 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setScore(n)} className="text-2xl" style={{ background: "none", border: "none", cursor: "pointer", opacity: n <= score ? 1 : 0.3 }}>★</button>
                ))}
              </div>
              <div className="flex gap-3">
                <button disabled={confirmPending || waitConfirm}
                  onClick={() => { doConfirm({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "confirmDelivery", args: [taskId, score] }); setShowConfirmModal(false); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #f07828, #d05e10)", color: "white", cursor: "pointer" }}>
                  {confirmPending || waitConfirm ? "Processing…" : `Confirm & Pay (${score}★)`}
                </button>
                <button onClick={() => setShowConfirmModal(false)} className="px-5 py-3 rounded-xl text-sm"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b", color: "#5a807a", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* AUTO-CONFIRM */}
          {canAutoConf && (
            <button disabled={autoConfPending || waitAutoConf}
              onClick={() => doAutoConf({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "autoConfirm", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "#22c55e15", border: "1px solid #22c55e40", color: "#22c55e", cursor: "pointer" }}>
              {autoConfPending || waitAutoConf ? "Processing…" : autoConfDone ? "✅ Auto-confirmed!" : "⏰ Auto-Confirm (24h passed)"}
            </button>
          )}

          {/* DISPUTE */}
          {canDispute && !showConfirmModal && (
            <button disabled={disputePending || waitDispute}
              onClick={() => doDispute({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "disputeTask", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "#e6303010", border: "1px solid #e6303040", color: "#e63030", cursor: "pointer" }}>
              {disputePending || waitDispute ? "Processing…" : `⚠️ Dispute (requires ${formatUnits(disputeDepositAmount, 6)} USDC deposit)`}
            </button>
          )}

          {/* CANCEL */}
          {canCancel && (
            <button disabled={cancelPending || waitCancel}
              onClick={() => doCancel({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "cancelTask", args: [taskId] })}
              className="w-full py-3 rounded-2xl text-sm font-semibold"
              style={{ background: "#1a2e2b", color: "#5a807a", cursor: "pointer" }}>
              {cancelPending || waitCancel ? "Cancelling…" : cancelDone ? "✅ Cancelled" : "Cancel Task"}
            </button>
          )}

          {/* COMPLETED */}
          {isCompleted && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "#3ec95a10", border: "1px solid #3ec95a30" }}>
              <p className="text-sm font-semibold" style={{ color: "#3ec95a" }}>Task completed — payment released</p>
              {task.score > 0 && <p className="text-xs mt-1" style={{ color: "#e8c842" }}>{"★".repeat(task.score)}{"☆".repeat(5 - task.score)} {task.score}/5</p>}
            </div>
          )}

          {/* DISPUTE RESOLUTION PANEL */}
          {isDisputed && (
            <div className="rounded-2xl p-5" style={{ background: "#e6303008", border: "1px solid #e6303040" }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: "#e63030" }}>⚠️ Disputed</h3>
              <p className="text-xs mb-4" style={{ color: "#5a807a" }}>Awaiting arbiter resolution.</p>
              {canResolve ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold" style={{ color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)" }}>🔑 You are the resolver</p>
                  <div className="flex gap-3">
                    <button disabled={resolvePending || waitResolve}
                      onClick={() => doResolve({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "resolveDispute", args: [taskId, true] })}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: "#3ec95a18", border: "1px solid #3ec95a", color: "#3ec95a", cursor: "pointer" }}>
                      ✅ Award Agent
                    </button>
                    <button disabled={resolvePending || waitResolve}
                      onClick={() => doResolve({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "resolveDispute", args: [taskId, false] })}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: "#e6303018", border: "1px solid #e63030", color: "#e63030", cursor: "pointer" }}>
                      🔴 Slash + Refund
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "#5a807a" }}>Only the platform resolver can settle this dispute.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
