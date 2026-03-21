import { V3_STATUS_NAMES } from "@/lib/contracts";

// Colors mirror on-chain enum: 0=Open,1=Claimed,2=Delivered,3=Confirmed,4=Disputed,5=Resolved,6=Cancelled
const STATUS_COLORS: Record<number, string> = {
  0: "bg-teal-500/20 text-teal-300 border-teal-500/30",          // Open
  1: "bg-amber-500/20 text-amber-400 border-amber-500/30",       // Claimed
  2: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",    // Delivered
  3: "bg-green-500/20 text-green-400 border-green-500/30",       // Confirmed
  4: "bg-red-500/20 text-red-400 border-red-500/30",             // Disputed
  5: "bg-purple-500/20 text-purple-400 border-purple-500/30",    // Resolved
  6: "bg-gray-500/20 text-gray-400 border-gray-500/30",          // Cancelled
};

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        STATUS_COLORS[status] ?? STATUS_COLORS[6]
      }`}
    >
      {V3_STATUS_NAMES[status] ?? "Unknown"}
    </span>
  );
}
