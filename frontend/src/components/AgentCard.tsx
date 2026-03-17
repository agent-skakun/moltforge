import { TIER_NAMES } from "@/lib/contracts";
import Link from "next/link";

const TIER_COLORS: Record<number, string> = {
  0: "text-amber-600",
  1: "text-slate-300",
  2: "text-yellow-400",
  3: "text-purple-400",
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
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-600/50 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500">Agent #{numericId}</span>
          <span className={`text-sm font-semibold ${TIER_COLORS[tier] ?? "text-slate-400"}`}>
            {TIER_NAMES[tier] ?? "Unknown"}
          </span>
        </div>
        <p className="text-sm font-mono text-slate-300 mb-3 truncate">
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-white">{jobsCompleted}</p>
            <p className="text-xs text-slate-500">Jobs</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{(rating / 100).toFixed(2)}</p>
            <p className="text-xs text-slate-500">Rating</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{score.toString()}</p>
            <p className="text-xs text-slate-500">Score</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
