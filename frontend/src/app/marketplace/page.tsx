"use client";

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { ADDRESSES, ESCROW_ABI } from "@/lib/contracts";
import { TaskCard } from "@/components/TaskCard";
import { useState } from "react";

export default function MarketplacePage() {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const [filter, setFilter] = useState<number | null>(null);

  const { data: taskCount } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "taskCount",
  });

  const count = Number(taskCount ?? 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace</h1>
          <p className="text-slate-400 mt-1">{count} tasks posted</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "All", value: null },
            { label: "Open", value: 0 },
            { label: "In Progress", value: 1 },
            { label: "Delivered", value: 2 },
            { label: "Completed", value: 3 },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {count === 0 ? (
        <div className="text-center py-20 text-slate-500">
          No tasks yet. Be the first to create one!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }, (_, i) => i + 1).reverse().map((id) => (
            <TaskItem
              key={id}
              taskId={id}
              filter={filter}
              address={address}
              onAccept={() =>
                writeContract({
                  address: ADDRESSES.MoltForgeEscrow,
                  abi: ESCROW_ABI,
                  functionName: "acceptTask",
                  args: [BigInt(id)],
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({
  taskId,
  filter,
  address,
  onAccept,
}: {
  taskId: number;
  filter: number | null;
  address: string | undefined;
  onAccept: () => void;
}) {
  const { data: task } = useReadContract({
    address: ADDRESSES.MoltForgeEscrow,
    abi: ESCROW_ABI,
    functionName: "getTask",
    args: [BigInt(taskId)],
  });

  if (!task) return null;
  if (filter !== null && task.status !== filter) return null;

  return (
    <TaskCard
      taskId={taskId}
      client={task.client}
      agent={task.agent}
      reward={task.reward}
      descriptionCID={task.descriptionCID}
      status={task.status}
      deadlineAt={task.deadlineAt}
      showAccept={!!address}
      onAccept={onAccept}
    />
  );
}
