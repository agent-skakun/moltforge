"use client";

import { StatusBadge } from "./StatusBadge";
import { formatUnits } from "viem";

interface TaskCardProps {
  taskId: number;
  client: string;
  agent: string;
  reward: bigint;
  descriptionCID: string;
  status: number;
  deadlineAt: bigint;
  onAccept?: () => void;
  showAccept?: boolean;
}

export function TaskCard({
  taskId,
  client,
  reward,
  descriptionCID,
  status,
  deadlineAt,
  onAccept,
  showAccept,
}: TaskCardProps) {
  const deadline = new Date(Number(deadlineAt) * 1000);
  const isExpired = deadline < new Date();

  return (
    <div className="bg-forge-card border border-forge-border rounded-xl p-5 hover:border-teal-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-forge-white/40">Task #{taskId}</span>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-forge-white/70 font-jetbrainsMono mb-3 truncate" title={descriptionCID}>
        CID: {descriptionCID.length > 30 ? `${descriptionCID.slice(0, 15)}...${descriptionCID.slice(-10)}` : descriptionCID}
      </p>
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-forge-white/50">Reward</span>
        <span className="text-forge-white font-semibold font-jetbrainsMono">{formatUnits(reward, 6)} USDC</span>
      </div>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-forge-white/50">Deadline</span>
        <span className={isExpired ? "text-red-lobster" : "text-forge-white/70"}>
          {deadline.toLocaleDateString()}
        </span>
      </div>
      <p className="text-xs text-forge-white/40 mb-3 truncate font-jetbrainsMono">
        Client: {client.slice(0, 6)}...{client.slice(-4)}
      </p>
      {showAccept && status === 0 && (
        <button
          onClick={onAccept}
          className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Accept Task
        </button>
      )}
    </div>
  );
}
