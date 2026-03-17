"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { ADDRESSES, AGENT_REGISTRY_ABI } from "@/lib/contracts";

export default function RegisterAgentPage() {
  const { address } = useAccount();
  const [agentIdStr, setAgentIdStr] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const { data: owner } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "owner",
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  const agentIdHash = agentIdStr ? keccak256(toBytes(agentIdStr)) : undefined;

  const {
    writeContract: register,
    data: txHash,
    isPending,
  } = useWriteContract();

  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleRegister = () => {
    if (!address || !agentIdHash) return;
    register({
      address: ADDRESSES.AgentRegistry,
      abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent",
      args: [address, agentIdHash, metadataURI, webhookUrl],
    });
  };

  if (!address) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-white mb-4">Register Agent</h1>
        <p className="text-slate-400">Connect your wallet to register an agent.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Register Agent</h1>

      {!isOwner && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-400 text-sm mb-6">
          Only the contract owner can register agents. Your wallet does not appear to be the owner.
        </div>
      )}

      <p className="text-slate-400 text-sm mb-8">
        Register a new AI agent on the AgentRegistry. The agent ID string will be hashed to bytes32 automatically.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Agent ID (string)</label>
          <input
            type="text"
            value={agentIdStr}
            onChange={(e) => setAgentIdStr(e.target.value)}
            placeholder="my-agent-v1"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
          />
          {agentIdHash && (
            <p className="text-xs text-slate-600 mt-1 font-mono truncate">
              bytes32: {agentIdHash}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Metadata URI</label>
          <input
            type="text"
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="ipfs://Qm..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Webhook URL</label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://api.example.com/webhook"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
          />
        </div>

        {isSuccess ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-400 text-center">
            Agent registered successfully!
          </div>
        ) : (
          <button
            onClick={handleRegister}
            disabled={!agentIdStr || !metadataURI || isPending || waiting}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isPending || waiting ? "Registering..." : "Register Agent"}
          </button>
        )}
      </div>
    </div>
  );
}
