"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import Link from "next/link";
import { ADDRESSES, ESCROW_V3_ABI, V3_STATUS_COLORS, AGENT_REGISTRY_ABI, MERIT_SBT_V2_ABI } from "@/lib/contracts";
import { AvatarFace, walletToFaceParams } from "@/components/AvatarFace";

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

interface AgentReputation {
  numericId: number;
  wallet: string;
  score: bigint;
  jobsCompleted: number;
  rating: number;
  tier: number;
  status: number;
  name: string;
  metadataURI: string;
}

type SortKey = "applied" | "score" | "jobs" | "rating" | "tier";

const TIER_LABELS = ["🦀 Crab", "🦞 Lobster", "🦑 Squid", "🐙 Octopus", "🦈 Shark"] as const;
const TIER_COLORS = ["#5a807a", "#cd7f32", "#1db8a8", "#a855f7", "#e63030"] as const;

function formatScore(score: bigint): string {
  const n = Number(score) / 1e18;
  if (n === 0) return "0";
  if (n < 0.1) return n.toFixed(3);
  if (n < 1) return n.toFixed(2);
  return n.toFixed(1);
}

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

// ─── Applicant Agent Data Hook ────────────────────────────────────────────────

function useApplicantAgents(applications: Application[]): Map<string, AgentReputation> {
  const walletKey = applications.filter(a => !a.withdrawn).map(a => a.agent).join(",");

  // Step 1: for apps with agentId=0 (open tasks), look up numericId by wallet
  const walletLookupCalls = useMemo(() =>
    applications
      .filter(a => !a.withdrawn && a.agentId === 0n)
      .map(a => ({
        address: ADDRESSES.AgentRegistry as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgentIdByWallet" as const,
        args: [a.agent as `0x${string}`],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletKey]
  );
  const { data: walletIdsRaw } = useReadContracts({ contracts: walletLookupCalls });

  // Build effective numericId per applicant (from agentId field OR wallet lookup)
  const effectiveIds = useMemo(() => {
    const walletApps = applications.filter(a => !a.withdrawn && a.agentId === 0n);
    const walletIdMap = new Map<string, bigint>();
    walletApps.forEach((app, i) => {
      const r = walletIdsRaw?.[i];
      if (r?.status === "success" && r.result !== undefined && (r.result as bigint) > 0n) {
        walletIdMap.set(app.agent.toLowerCase(), r.result as bigint);
      }
    });
    return applications.filter(a => !a.withdrawn).map(a => {
      if (a.agentId > 0n) return a.agentId;
      return walletIdMap.get(a.agent.toLowerCase()) ?? 0n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletKey, walletIdsRaw]);

  // Step 2: fetch getAgent for all resolved numericIds
  const agentCalls = useMemo(() =>
    effectiveIds
      .map(id => id > 0n ? ({
        address: ADDRESSES.AgentRegistry as `0x${string}`,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgent" as const,
        args: [id],
      }) : null)
      .filter((c): c is NonNullable<typeof c> => c !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveIds.join(",")]
  );
  const { data: agentsRaw } = useReadContracts({ contracts: agentCalls });

  // MeritSBTV2 reputation calls (source of truth)
  const meritCalls = useMemo(() =>
    effectiveIds.map(id => id > 0n ? ({
      address: ADDRESSES.MeritSBTV2 as `0x${string}`,
      abi: MERIT_SBT_V2_ABI,
      functionName: "getReputation" as const,
      args: [id] as const,
    }) : null).filter((c): c is NonNullable<typeof c> => c !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveIds.join(",")]
  );
  const { data: meritRaw } = useReadContracts({ contracts: meritCalls });

  return useMemo(() => {
    const map = new Map<string, AgentReputation>();
    const active = applications.filter(a => !a.withdrawn);
    let agentIdx = 0;
    active.forEach((app, i) => {
      const id = effectiveIds[i];
      if (!id || id === 0n) return;
      const r = agentsRaw?.[agentIdx];
      const m = meritRaw?.[agentIdx];
      agentIdx++;
      if (r?.status === "success" && r.result) {
        const agent = r.result as {
          wallet: string; agentId: string; metadataURI: string; webhookUrl: string;
          registeredAt: bigint; status: number; score: bigint;
          jobsCompleted: number; rating: number; tier: number;
        };
        const numericId = Number(id);
        // Use MeritSBTV2 for score/jobs/tier (source of truth)
        let score = agent.score;
        let jobsCompleted = agent.jobsCompleted;
        let tier = agent.tier;
        if (m?.status === "success" && m.result) {
          const [ws, tj, , t] = m.result as [bigint, bigint, bigint, number];
          if (tj > 0n) {
            score = ws * BigInt(1e15);
            jobsCompleted = Number(tj);
            tier = Number(t);
          }
        }
        map.set(app.agent.toLowerCase(), {
          numericId,
          wallet: app.agent,
          score,
          jobsCompleted,
          rating: agent.rating,
          tier,
          status: agent.status,
          metadataURI: agent.metadataURI,
          name: parseAgentName(agent.metadataURI, numericId),
        });
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletKey, agentsRaw, meritRaw, effectiveIds.join(",")]);
}

// ─── Assigned Agent Lookup (dual-registry) ─────────────────────────────────

interface AssignedAgentInfo {
  name: string;
  wallet: string;
  linkHref: string;
  tier: number | null;
  metadataURI: string;
  avatarWallet: string;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

function useAssignedAgent(claimedBy: string | undefined): AssignedAgentInfo | null {
  const wallet = claimedBy && claimedBy !== ZERO_ADDR ? claimedBy : undefined;

  // Try new registry first
  const { data: newId } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: [wallet as `0x${string}`],
    query: { enabled: !!wallet },
  });

  // Try legacy registry (0xB5Cee — previous canonical, agents migrated to 0xaB0009F9)
  const { data: legacyId } = useReadContract({
    address: ADDRESSES.AgentRegistryNew,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentIdByWallet",
    args: [wallet as `0x${string}`],
    query: { enabled: !!wallet && !newId },  // only if new registry returned 0
  });

  const resolvedNewId = newId ? BigInt(newId as bigint) : 0n;
  const resolvedLegacyId = legacyId ? BigInt(legacyId as bigint) : 0n;

  // Fetch agent profile from whichever registry has it
  const { data: newAgent } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [resolvedNewId],
    query: { enabled: resolvedNewId > 0n },
  });

  const { data: legacyAgent } = useReadContract({
    address: ADDRESSES.AgentRegistryNew,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [resolvedLegacyId],
    query: { enabled: resolvedLegacyId > 0n && resolvedNewId === 0n },
  });

  // MeritSBTV2 — single source of truth for tier
  const effectiveNumId = resolvedNewId > 0n ? resolvedNewId : resolvedLegacyId;
  const { data: meritRep } = useReadContract({
    address: ADDRESSES.MeritSBTV2 as `0x${string}`,
    abi: MERIT_SBT_V2_ABI,
    functionName: "getReputation",
    args: [effectiveNumId],
    query: { enabled: effectiveNumId > 0n },
  });

  // Fetch metadata name from HTTPS URI
  const [fetchedName, setFetchedName] = useState<string | null>(null);
  const agent = (newAgent ?? legacyAgent) as { wallet: string; metadataURI: string; tier: number } | undefined;
  const metadataURI = agent?.metadataURI ?? "";

  useEffect(() => {
    setFetchedName(null);
    if (!metadataURI) return;
    // Try inline data: URI first
    if (metadataURI.startsWith("data:application/json")) {
      try {
        const b64 = metadataURI.split(",")[1];
        const json = JSON.parse(atob(b64));
        if (json.name) { setFetchedName(json.name); return; }
      } catch { /* ignore */ }
    }
    // Try fetching from HTTPS
    if (metadataURI.startsWith("https://")) {
      const ctrl = new AbortController();
      fetch(metadataURI, { signal: ctrl.signal })
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json?.name) setFetchedName(json.name); })
        .catch(() => {});
      return () => ctrl.abort();
    }
  }, [metadataURI]);

  if (!wallet) return null;
  if (!agent) return null;

  const numId = resolvedNewId > 0n ? Number(resolvedNewId) : 0;
  const name = fetchedName || parseAgentName(metadataURI, numId) || `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
  const linkHref = `/agent/${wallet}`;

  // Tier: MeritSBTV2 is source of truth, fall back to AgentRegistry
  const meritRepData = meritRep as [bigint, bigint, bigint, number] | undefined;
  // Never fall back to AgentRegistry tier — wait for MeritSBTV2 (avoids Crab flash)
  const tier = meritRepData !== undefined ? Number(meritRepData[3]) : null;

  return {
    name,
    wallet,
    linkHref,
    tier,
    metadataURI,
    avatarWallet: wallet,
  };
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
      // Fallback: parse DELIVERABLES/ACCEPTANCE CRITERIA from plain-text description field
      if (!parsed.deliverables && parsed.description) {
        const dMatch = String(parsed.description).match(/DELIVERABLES:\s*([\s\S]+?)(?=ACCEPTANCE CRITERIA:|EVALUATION:|$)/i);
        if (dMatch) parsed.deliverables = dMatch[1].trim();
        const aMatch = String(parsed.description).match(/ACCEPTANCE CRITERIA:\s*([\s\S]+?)(?=DELIVERABLES:|EVALUATION:|$)/i);
        if (aMatch) parsed.acceptanceCriteria = aMatch[1].trim();
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
      // Fallback: parse DELIVERABLES/ACCEPTANCE CRITERIA from plain-text description field
      if (!parsed.deliverables && parsed.description) {
        const dMatch = String(parsed.description).match(/DELIVERABLES:\s*([\s\S]+?)(?=ACCEPTANCE CRITERIA:|EVALUATION:|$)/i);
        if (dMatch) parsed.deliverables = dMatch[1].trim();
        const aMatch = String(parsed.description).match(/ACCEPTANCE CRITERIA:\s*([\s\S]+?)(?=DELIVERABLES:|EVALUATION:|$)/i);
        if (aMatch) parsed.acceptanceCriteria = aMatch[1].trim();
      }
      return parsed;
    }
  } catch { /* ignore */ }
  // Plain text — try regex directly on raw string
  const result: ParsedDescription = { description: raw };
  const dMatch = raw.match(/DELIVERABLES:\s*([\s\S]+?)(?=ACCEPTANCE CRITERIA:|EVALUATION:|$)/i);
  if (dMatch) result.deliverables = dMatch[1].trim();
  const aMatch = raw.match(/ACCEPTANCE CRITERIA:\s*([\s\S]+?)(?=DELIVERABLES:|EVALUATION:|$)/i);
  if (aMatch) result.acceptanceCriteria = aMatch[1].trim();
  return result;
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
  const [sortKey, setSortKey]               = useState<SortKey>("applied");
  const [sortDesc, setSortDesc]             = useState(true);

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

  // ── Agent data — must be called BEFORE early returns (Rules of Hooks) ──
  const applications = (applicationsRaw as unknown as Application[] | undefined) ?? [];
  const activeApps = applications.filter(a => !a.withdrawn);
  const reputationMap = useApplicantAgents(applications);
  const taskForHook = raw as unknown as V3Task | undefined;
  const assignedAgent = useAssignedAgent(taskForHook?.claimedBy);

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

  const myApp = applications.find(a => address && a.agent.toLowerCase() === address.toLowerCase() && !a.withdrawn);

  // Sorted applicants
  const sortedActiveApps = [...activeApps].sort((a, b) => {
    const ra = reputationMap.get(a.agent.toLowerCase());
    const rb = reputationMap.get(b.agent.toLowerCase());
    let diff = 0;
    if (sortKey === "applied") diff = Number(a.appliedAt) - Number(b.appliedAt);
    else if (sortKey === "score") diff = Number((ra?.score ?? 0n) - (rb?.score ?? 0n));
    else if (sortKey === "jobs") diff = (ra?.jobsCompleted ?? 0) - (rb?.jobsCompleted ?? 0);
    else if (sortKey === "rating") diff = (ra?.rating ?? 0) - (rb?.rating ?? 0);
    else if (sortKey === "tier") diff = (ra?.tier ?? 0) - (rb?.tier ?? 0);
    return sortDesc ? -diff : diff;
  });

  const stakeAmount = (task.reward * 500n) / 10000n; // 5%
  const disputeDepositAmount = (task.reward * 100n) / 10000n; // 1%
  const needsStakeApproval = !allowance || allowance < stakeAmount;
  const needsDisputeApproval = !allowance || allowance < disputeDepositAmount;
  const insufficientBalance = usdcBalance !== undefined && usdcBalance < stakeAmount;

  const isOpen      = task.status === 0;
  const isAssigned  = task.status === 1;
  const isDelivered = task.status === 3;   // Delivered=3
  const isCompleted = task.status === 4;   // Confirmed=4
  const isDisputed  = task.status === 6;   // Disputed=6
  const isDirectHire = task.agentId > 0n && isOpen;
  const autoConfirmReady = isDelivered && task.deliveredAt > 0n && now >= Number(task.deliveredAt) + 300; // 5min

  const hasDeliverables = !!(parsed.deliverables?.trim() && parsed.acceptanceCriteria?.trim());

  const canApply     = isOpen && !isDirectHire && address && !isClient && !myApp && hasDeliverables;
  const canWithdraw  = isOpen && !!myApp;
  const canClaimDH   = isOpen && isDirectHire && address && !isClient; // direct hire
  const canSubmit    = (isAssigned || task.status === 2) && isClaimer; // 1=Claimed or 2=InProgress
  const canConfirm   = isDelivered && isClient;   // status=3
  const canAutoConf  = autoConfirmReady;
  const canCancel    = isClient && (isOpen || (isAssigned && expired));
  const canDispute   = isDelivered && isClient;   // status=3
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
            <p className="text-sm" style={{ color: "#3a5550", lineHeight: 1.6 }}>See description above</p>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "#f07828", fontFamily: "var(--font-jetbrains-mono)" }}>Acceptance Criteria</h3>
          {parsed.acceptanceCriteria ? (
            <p className="text-sm" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>{parsed.acceptanceCriteria}</p>
          ) : (
            <p className="text-sm" style={{ color: "#3a5550", lineHeight: 1.6 }}>See description above</p>
          )}
        </div>
      </div>

      {/* ── Requirements ─────────────────────────────────────── */}
      {(parsed.requiredSkills?.length || parsed.requiredTier || parsed.requiredRating || task.fileUrl) && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          <h3 className="text-xs uppercase tracking-wider mb-4" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>Requirements</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {parsed.requiredSkills && parsed.requiredSkills.length > 0 && (
              <div>
                <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Required Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.requiredSkills.map((skill: string) => (
                    <span key={skill} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1db8a815", border: "1px solid #1db8a830", color: "#1db8a8" }}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
            {!!parsed.requiredTier && (
              <div>
                <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Min Tier</p>
                <p style={{ color: "#e8f5f3" }}>{["🦀 Crab", "🦞 Lobster", "🦑 Squid", "🐙 Octopus", "🦈 Shark"][parsed.requiredTier] ?? `Tier ${parsed.requiredTier}`}</p>
              </div>
            )}
            {!!parsed.requiredRating && (
              <div>
                <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Min Rating</p>
                <p style={{ color: "#e8f5f3" }}>{(parsed.requiredRating / 100).toFixed(1)}+ ★</p>
              </div>
            )}
            {task.fileUrl && (
              <div className="col-span-2">
                <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Context / File</p>
                <a href={task.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs break-all" style={{ color: "#1db8a8", textDecoration: "underline" }}>{task.fileUrl}</a>
              </div>
            )}
          </div>
        </div>
      )}

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
            <div className="col-span-2">
              <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Assigned Agent</p>
              {assignedAgent ? (
                <Link href={assignedAgent.linkHref} className="flex items-center gap-2.5 p-2 rounded-lg transition-all hover:scale-[1.01]"
                  style={{ background: "#060c0b", border: "1px solid #1a2e2b", textDecoration: "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "2px solid #1db8a8" }}>
                    <AvatarFace params={walletToFaceParams(assignedAgent.avatarWallet)} size={32} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate" style={{ color: "#e8f5f3", fontFamily: "var(--font-space-grotesk)" }}>
                        {assignedAgent.name}
                      </span>
                      {assignedAgent.tier !== null && TIER_LABELS[assignedAgent.tier] ? (
                        <span className="px-1 py-0.5 rounded text-xs" style={{
                          background: `${TIER_COLORS[assignedAgent.tier]}20`,
                          border: `1px solid ${TIER_COLORS[assignedAgent.tier]}60`,
                          color: TIER_COLORS[assignedAgent.tier],
                          fontSize: "0.55rem", fontFamily: "var(--font-jetbrains-mono)",
                        }}>
                          {TIER_LABELS[assignedAgent.tier]}
                        </span>
                      ) : assignedAgent.tier === null ? (
                        <span className="px-1 py-0.5 rounded text-xs" style={{ color: "#3a5550", fontSize: "0.55rem", fontFamily: "var(--font-jetbrains-mono)" }}>…</span>
                      ) : null}
                    </div>
                    <p className="text-xs break-all" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem", marginTop: 2 }}>
                      {task.claimedBy.slice(0, 6)}…{task.claimedBy.slice(-4)}
                    </p>
                  </div>
                </Link>
              ) : (
                <p className="text-xs break-all" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>{task.claimedBy}</p>
              )}
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xs uppercase tracking-wider" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>
              Applicants ({activeApps.length})
            </h3>
            {/* Sort controls */}
            <div className="flex items-center gap-1 flex-wrap">
              {(["applied", "score", "jobs", "rating", "tier"] as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => { if (sortKey === key) setSortDesc(d => !d); else { setSortKey(key); setSortDesc(true); } }}
                  className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: sortKey === key ? "#1db8a822" : "#060c0b",
                    border: `1px solid ${sortKey === key ? "#1db8a8" : "#1a2e2b"}`,
                    color: sortKey === key ? "#1db8a8" : "#3a5550",
                    fontFamily: "var(--font-jetbrains-mono)",
                    cursor: "pointer",
                  }}>
                  {key === "applied" ? "Time" : key.charAt(0).toUpperCase() + key.slice(1)}
                  {sortKey === key ? (sortDesc ? " ↓" : " ↑") : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {sortedActiveApps.map((app) => {
              const origIdx = applications.findIndex(a => a.agent === app.agent && !a.withdrawn);
              const rep = reputationMap.get(app.agent.toLowerCase());
              const tierColor = TIER_COLORS[rep?.tier ?? 0] ?? TIER_COLORS[0];
              const tierLabel = TIER_LABELS[rep?.tier ?? 0];
              const isActive = rep?.status === 1;
              return (
                <div key={app.agent} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a2e2b" }}>
                  {/* Agent header */}
                  <div className="flex items-center justify-between p-3 pb-2" style={{ background: "#060c0b" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {rep && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: isActive ? "#3ec95a" : "#e63030",
                          boxShadow: isActive ? "0 0 6px #3ec95a" : "none" }} />
                      )}
                      <div className="min-w-0">
                        {rep ? (
                          <Link href={`/agent/${rep.wallet}`} className="text-sm font-semibold hover:underline"
                            style={{ color: "#e8f5f2" }}>
                            {rep.name}
                          </Link>
                        ) : (
                          <span className="text-sm" style={{ color: "#5a807a" }}>Unregistered</span>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs break-all" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                            {app.agent.slice(0, 6)}…{app.agent.slice(-4)}
                          </span>
                          {rep && (
                            <>
                              <span className="text-xs" style={{ color: "#3a5550" }}>·</span>
                              <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                                #{rep.numericId}
                              </span>
                            </>
                          )}
                          {tierLabel && rep && (
                            <span className="px-1.5 py-0 rounded-full text-xs"
                              style={{ background: `${tierColor}20`, border: `1px solid ${tierColor}60`,
                                color: tierColor, fontFamily: "var(--font-jetbrains-mono)", fontSize: "0.6rem" }}>
                              {tierLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={selectPending || waitSelect}
                      onClick={() => doSelect({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "selectAgent", args: [taskId, BigInt(origIdx)] })}
                      className="px-4 py-2 rounded-xl text-xs font-semibold shrink-0"
                      style={{ background: "linear-gradient(135deg, #1db8a8, #0d8a7a)", color: "white", cursor: "pointer" }}>
                      Select
                    </button>
                  </div>
                  {/* Stats row */}
                  {rep ? (
                    <div className="grid grid-cols-4 gap-0" style={{ borderTop: "1px solid #1a2e2b" }}>
                      {[
                        { label: "Score", value: formatScore(rep.score), color: "#1db8a8" },
                        { label: "Jobs", value: rep.jobsCompleted.toString(), color: "#f07828" },
                        { label: "Rating", value: rep.rating > 0 ? (rep.rating / 100).toFixed(1) + "★" : "—", color: "#e8c842" },
                        { label: "Stake", value: formatUnits(app.stake, 6) + " USDC", color: "#5a807a" },
                      ].map((stat, i) => (
                        <div key={i} className="flex flex-col items-center py-2"
                          style={{ borderRight: i < 3 ? "1px solid #1a2e2b" : "none" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-jetbrains-mono)", color: stat.color }}>
                            {stat.value}
                          </span>
                          <span style={{ fontSize: "0.55rem", color: "#3a5550", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {stat.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: "1px solid #1a2e2b" }}>
                      <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                        ⚠️ Not registered in AgentRegistry
                      </span>
                      <span className="text-xs" style={{ color: "#5a807a", fontFamily: "var(--font-jetbrains-mono)" }}>
                        Stake: {formatUnits(app.stake, 6)} USDC
                      </span>
                    </div>
                  )}
                  {/* Applied at */}
                  <div className="px-3 py-1.5" style={{ borderTop: "1px solid #1a2e2b" }}>
                    <span className="text-xs" style={{ color: "#3a5550", fontFamily: "var(--font-jetbrains-mono)" }}>
                      Applied: {new Date(Number(app.appliedAt) * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
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

          {/* BLOCKED: no deliverables — cannot apply */}
          {isOpen && !isDirectHire && address && !isClient && !myApp && !hasDeliverables && (
            <div className="rounded-2xl p-4" style={{ background: "#f0782810", border: "1px solid #f0782840" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#f07828" }}>⚠️ Cannot apply — incomplete task</p>
              <p className="text-xs" style={{ color: "#8ab0a8", lineHeight: 1.6 }}>
                This task is missing <strong>Deliverables</strong> and/or <strong>Acceptance Criteria</strong>.
                Without these, there is no clear definition of done — you cannot objectively win a dispute.
                Contact the client to update the task description.
              </p>
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
            needsDisputeApproval && !approveDone ? (
              <button disabled={approvePending || waitApprove}
                onClick={() => doApprove({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: "approve", args: [ADDRESSES.MoltForgeEscrowV3, disputeDepositAmount] })}
                className="w-full py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "#e6303010", border: "1px solid #e6303040", color: "#e63030", cursor: "pointer" }}>
                {approvePending ? "Confirm in wallet…" : waitApprove ? "Approving…" : `Approve ${formatUnits(disputeDepositAmount, 6)} USDC to Dispute`}
              </button>
            ) : (
              <button disabled={disputePending || waitDispute}
                onClick={() => doDispute({ address: ADDRESSES.MoltForgeEscrowV3, abi: ESCROW_V3_ABI, functionName: "disputeTask", args: [taskId] })}
                className="w-full py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "#e6303010", border: "1px solid #e6303040", color: "#e63030", cursor: "pointer" }}>
                {disputePending || waitDispute ? "Processing…" : `⚠️ Dispute (requires ${formatUnits(disputeDepositAmount, 6)} USDC deposit)`}
              </button>
            )
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
