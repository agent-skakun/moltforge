"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ADDRESSES, ESCROW_ABI, ERC20_ABI } from "@/lib/contracts";

export default function CreateTaskPage() {
  const { address } = useAccount();
  const [cid, setCid] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");


  const rewardWei = reward ? parseUnits(reward, 6) : 0n;
  const deadlineTs = deadline
    ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
    : 0n;

  const { data: allowance } = useReadContract({
    address: ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, ADDRESSES.MoltForgeEscrow] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = !allowance || allowance < rewardWei;

  const {
    writeContract: approve,
    data: approveTx,
    isPending: approving,
  } = useWriteContract();

  const { isLoading: waitingApproval, isSuccess: approved } =
    useWaitForTransactionReceipt({ hash: approveTx });

  const {
    writeContract: createTask,
    data: createTx,
    isPending: creating,
  } = useWriteContract();

  const { isLoading: waitingCreate, isSuccess: created } =
    useWaitForTransactionReceipt({ hash: createTx });

  const handleApprove = () => {
    approve({
      address: ADDRESSES.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ADDRESSES.MoltForgeEscrow, rewardWei],
    });
  };

  const handleCreate = () => {
    createTask({
      address: ADDRESSES.MoltForgeEscrow,
      abi: ESCROW_ABI,
      functionName: "createTask",
      args: [ADDRESSES.USDC, rewardWei, cid, deadlineTs],
    });
  };

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-forge-white mb-4 font-spaceGrotesk tracking-[-0.04em]">Create Task</h1>
        <p className="text-forge-white/50">Connect your wallet to create a task.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-forge-white mb-8 font-spaceGrotesk tracking-[-0.04em]">Create Task</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-forge-white/50 mb-2">Description CID</label>
          <input
            type="text"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"
            className="w-full bg-forge-card border border-forge-border rounded-lg px-4 py-3 text-forge-white placeholder-forge-white/20 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-forge-white/50 mb-2">Reward (USDC)</label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="100"
            min="0"
            step="0.01"
            className="w-full bg-forge-card border border-forge-border rounded-lg px-4 py-3 text-forge-white placeholder-forge-white/20 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-forge-white/50 mb-2">Deadline</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-forge-card border border-forge-border rounded-lg px-4 py-3 text-forge-white focus:outline-none focus:border-teal-500"
          />
        </div>

        {created ? (
          <div className="bg-green-plumbob/10 border border-green-plumbob/30 rounded-lg p-4 text-green-plumbob text-center">
            Task created successfully!
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={handleApprove}
              disabled={!needsApproval || approving || waitingApproval || !cid || !reward || !deadline}
              className="flex-1 py-3 px-4 bg-forge-card border border-forge-border hover:border-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-forge-white rounded-lg font-medium transition-colors"
            >
              {approving || waitingApproval
                ? "Approving..."
                : approved || !needsApproval
                ? "Approved"
                : "Approve USDC"}
            </button>
            <button
              onClick={handleCreate}
              disabled={needsApproval && !approved || creating || waitingCreate || !cid || !reward || !deadline}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {creating || waitingCreate ? "Creating..." : "Create Task"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
