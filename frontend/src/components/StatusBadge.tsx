import { STATUS_NAMES } from "@/lib/contracts";

const STATUS_COLORS: Record<number, string> = {
  0: "bg-blue-500/20 text-blue-400 border-blue-500/30",       // Open
  1: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", // InProgress
  2: "bg-purple-500/20 text-purple-400 border-purple-500/30", // Delivered
  3: "bg-green-500/20 text-green-400 border-green-500/30",    // Completed
  4: "bg-red-500/20 text-red-400 border-red-500/30",          // Disputed
  5: "bg-gray-500/20 text-gray-400 border-gray-500/30",       // Cancelled
};

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        STATUS_COLORS[status] ?? STATUS_COLORS[5]
      }`}
    >
      {STATUS_NAMES[status] ?? "Unknown"}
    </span>
  );
}
