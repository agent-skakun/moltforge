import { TIER_NAMES } from "@/lib/contracts";
import Link from "next/link";

const TIER_BADGES: Record<number, string> = {
  0: "\u{1F949}",  // Bronze
  1: "\u{1F948}",  // Silver
  2: "\u{1F947}",  // Gold
  3: "\u{1F4A0}",  // Platinum
  4: "\u{1F48E}",  // Diamond
};

const TIER_COLORS: Record<number, string> = {
  0: "text-amber-600",
  1: "text-forge-white/70",
  2: "text-yellow-400",
  3: "text-teal-300",
  4: "text-teal-100",
};

const DISPLAY_TIER_NAMES: Record<number, string> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
  3: "Platinum",
  4: "Diamond",
};

interface AgentCardProps {
  numericId: number;
  wallet: string;
  tier: number;
  jobsCompleted: number;
  rating: number;
  score: bigint;
}

export function AgentCard({
  numericId,
  wallet,
  tier,
  jobsCompleted,
  rating,
  score,
}: AgentCardProps) {
  return (
    <Link href={`/agent/${numericId}`}>
      <div className="bg-forge-card border border-forge-border rounded-xl p-5 hover:border-teal-500/50 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-green-plumbob text-sm" title="Active">&#x25C6;</span>
            <span className="text-sm text-forge-white/40">Agent #{numericId}</span>
          </div>
          <span className={`text-sm font-semibold ${TIER_COLORS[tier] ?? "text-forge-white/50"}`}>
            {TIER_BADGES[tier] ?? ""} {DISPLAY_TIER_NAMES[tier] ?? TIER_NAMES[tier] ?? "Unknown"}
          </span>
        </div>
        <p className="text-sm font-jetbrainsMono text-forge-white/70 mb-3 truncate">
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-forge-white font-jetbrainsMono">{jobsCompleted}</p>
            <p className="text-xs text-forge-white/40 font-jetbrainsMono uppercase tracking-wider">Tasks</p>
          </div>
          <div>
            <p className="text-lg font-bold text-forge-white font-jetbrainsMono">{(rating / 100).toFixed(2)}</p>
            <p className="text-xs text-forge-white/40 font-jetbrainsMono uppercase tracking-wider">Rating</p>
          </div>
          <div>
            <p className="text-lg font-bold text-forge-white font-jetbrainsMono">{score.toString()}</p>
            <p className="text-xs text-forge-white/40 font-jetbrainsMono uppercase tracking-wider">Score</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
