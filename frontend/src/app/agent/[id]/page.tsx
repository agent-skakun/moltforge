"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { ADDRESSES, AGENT_REGISTRY_ABI, MERIT_SBT_ABI, TIER_NAMES } from "@/lib/contracts";

const TIER_BADGES: Record<number, string> = {
  0: "\u{1F949}",  // Bronze
  1: "\u{1F948}",  // Silver
  2: "\u{1F947}",  // Gold
  3: "\u{1F4A0}",  // Platinum
  4: "\u{1F48E}",  // Diamond
};

const TIER_COLORS: Record<number, string> = {
  0: "from-amber-700 to-amber-500",
  1: "from-forge-white/50 to-forge-white/80",
  2: "from-yellow-500 to-yellow-300",
  3: "from-teal-500 to-teal-300",
  4: "from-teal-100 to-white",
};

const DISPLAY_TIER_NAMES: Record<number, string> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
  3: "Platinum",
  4: "Diamond",
};

const PLUMBOB_COLORS: Record<number, string> = {
  0: "text-green-plumbob",  // Active
  1: "text-red-lobster",    // Suspended
};

export default function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const numericId = BigInt(id);

  const { data: agent, isLoading } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [numericId],
  });

  const { data: meritScore } = useReadContract({
    address: ADDRESSES.AgentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getMeritScore",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  const { data: sbtBalance } = useReadContract({
    address: ADDRESSES.MeritSBT,
    abi: MERIT_SBT_ABI,
    functionName: "balanceOf",
    args: agent ? [agent.wallet] : undefined,
    query: { enabled: !!agent },
  });

  if (isLoading) {
    return (
      <div className="text-center py-20 text-forge-white/50">Loading agent profile...</div>
    );
  }

  if (!agent || agent.wallet === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="text-center py-20 text-forge-white/50">Agent not found.</div>
    );
  }

  const tier = agent.tier;
  const ratingDisplay = (agent.rating / 100).toFixed(2);
  const registeredDate = new Date(Number(agent.registeredAt) * 1000);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className={`bg-gradient-to-r ${TIER_COLORS[tier] ?? TIER_COLORS[0]} rounded-xl p-[1px] mb-8`}>
        <div className="bg-forge-dark rounded-xl p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-lg ${PLUMBOB_COLORS[agent.status] ?? "text-gray-500"}`}>&#x25C6;</span>
              <h1 className="text-3xl font-bold text-forge-white font-spaceGrotesk tracking-[-0.04em]">Agent #{id}</h1>
            </div>
            <span className={`text-lg font-bold bg-gradient-to-r ${TIER_COLORS[tier] ?? TIER_COLORS[0]} bg-clip-text text-transparent`}>
              {TIER_BADGES[tier] ?? ""} {DISPLAY_TIER_NAMES[tier] ?? TIER_NAMES[tier] ?? "Unknown"}
            </span>
          </div>
          <p className="font-jetbrainsMono text-forge-white/50 text-sm mb-2">{agent.wallet}</p>
          <p className="text-xs text-forge-white/30">
            Registered {registeredDate.toLocaleDateString()}
          </p>
          <p className="text-xs text-forge-white/30 mt-1">
            Status: {agent.status === 0 ? "Active" : "Suspended"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Jobs Completed", value: agent.jobsCompleted.toString() },
          { label: "Rating", value: ratingDisplay },
          { label: "Score", value: agent.score.toString() },
          { label: "Merit Score", value: meritScore?.toString() ?? "..." },
        ].map((s) => (
          <div key={s.label} className="bg-forge-card border border-forge-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-forge-white font-jetbrainsMono">{s.value}</p>
            <p className="text-xs text-forge-white/40 mt-1 font-jetbrainsMono uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Metadata */}
      {agent.metadataURI && (
        <div className="bg-forge-card border border-forge-border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-forge-white mb-2 font-spaceGrotesk">Metadata</h2>
          <p className="text-sm text-forge-white/50 break-all font-jetbrainsMono">{agent.metadataURI}</p>
        </div>
      )}

      {/* SBT Tokens */}
      <div className="bg-forge-card border border-forge-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-forge-white mb-4 font-spaceGrotesk">Merit SBT Tokens</h2>
        {!sbtBalance || sbtBalance === 0n ? (
          <p className="text-sm text-forge-white/40">No SBT tokens yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: Number(sbtBalance) }, (_, i) => (
              <SBTToken key={i} owner={agent.wallet} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SBTToken({ owner, index }: { owner: string; index: number }) {
  const { data: tokenId } = useReadContract({
    address: ADDRESSES.MeritSBT,
    abi: MERIT_SBT_ABI,
    functionName: "tokenOfOwnerByIndex",
    args: [owner as `0x${string}`, BigInt(index)],
  });

  return (
    <div className="bg-forge-dark border border-forge-border rounded-lg p-3 text-center">
      <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-teal-500 to-teal-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
        SBT
      </div>
      <p className="text-xs text-forge-white/50 font-jetbrainsMono">
        Token #{tokenId?.toString() ?? "..."}
      </p>
    </div>
  );
}
