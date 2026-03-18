import { V3_STATUS_NAMES } from "@/lib/contracts";

const STATUS_COLORS: Record<number, string> = {
  0: "bg-teal-500/20 text-teal-300 border-teal-500/30",          // Open
  1: "bg-amber-500/20 text-amber-400 border-amber-500/30",       // InProgress
  2: "bg-teal-700/20 text-teal-500 border-teal-700/30",          // Delivered
  3: "bg-green-plumbob/20 text-green-plumbob border-green-plumbob/30", // Completed
  4: "bg-red-lobster/20 text-red-lobster border-red-lobster/30",  // Disputed
  5: "bg-gray-500/20 text-gray-400 border-gray-500/30",          // Cancelled
};

export function StatusBadge({ status }: { status: number }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        STATUS_COLORS[status] ?? STATUS_COLORS[5]
      }`}
    >
      {V3_STATUS_NAMES[status] ?? "Unknown"}
    </span>
  );
}
