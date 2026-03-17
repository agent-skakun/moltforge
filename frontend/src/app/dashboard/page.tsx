"use client";

import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, AGENT_REGISTRY_ABI, ESCROW_ABI, TIER_NAMES } from "@/lib/contracts";
import { TaskCard } from "@/components/TaskCard";

import Link from "next/link";

export default function DashboardPage() {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-forge-white mb-4 font-spaceGrotesk tracking-[-0.04em]">Dashboard</h1>
        <p className="text-forge-white/50">Connect your wallet to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-forge-white mb-8 font-spaceGrotesk tracking-[-0.04em]">Dashboard</h1>
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

  return (
    <div className="bg-forge-card border border-forge-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-forge-white mb-4 font-spaceGrotesk">Agent Profile</h2>
      {!hasAgent ? (
        <div>
          <p className="text-sm text-forge-white/50 mb-4">No agent registered for this wallet.</p>
          <Link
            href="/register-agent"
            className="inline-block px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors"
          >
            Register Agent
          </Link>
        </div>
      ) : agent ? (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">ID</span>
            <Link href={`/agent/${agentId.toString()}`} className="text-sm text-teal-400 hover:underline">
              #{agentId.toString()}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">Tier</span>
            <span className="text-sm text-forge-white font-medium">{TIER_NAMES[agent.tier] ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">Jobs</span>
            <span className="text-sm text-forge-white font-jetbrainsMono">{agent.jobsCompleted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">Rating</span>
            <span className="text-sm text-forge-white font-jetbrainsMono">{(agent.rating / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">Score</span>
            <span className="text-sm text-forge-white font-jetbrainsMono">{agent.score.toString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-forge-white/50">Merit</span>
            <span className="text-sm text-forge-white font-jetbrainsMono">{meritScore?.toString() ?? "..."}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-forge-white/40">Loading...</p>
      )}
    </div>
  );
}

function MyTasks({ address }: { address: `0x${string}` }) {
  const { data: taskCount } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "taskCount",
  });

  const count = Number(taskCount ?? 0);

  return (
    <div>
      <h2 className="text-lg font-semibold text-forge-white mb-4 font-spaceGrotesk">My Tasks</h2>
      {count === 0 ? (
        <p className="text-sm text-forge-white/50">No tasks found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: count }, (_, i) => i + 1).reverse().map((id) => (
            <MyTaskItem key={id} taskId={id} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyTaskItem({ taskId, address }: { taskId: number; address: string }) {
  const { data: task } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  });

  if (!task) return null;

  const isMyTask =
    task.client.toLowerCase() === address.toLowerCase() ||
    task.agent.toLowerCase() === address.toLowerCase();

  if (!isMyTask) return null;

  return (
    <TaskCard
      taskId={taskId}
      client={task.client}
      agent={task.agent}
      reward={task.reward}
      descriptionCID={task.descriptionCID}
      status={task.status}
      deadlineAt={task.deadlineAt}
    />
  );
}
