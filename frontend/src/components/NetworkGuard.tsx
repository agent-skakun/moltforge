// NetworkGuard — shows a banner if the user is on the wrong network
// and offers to switch / add Base Sepolia with one click
"use client";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  // Do not show if not connected or already on the correct network
  if (!isConnected || chainId === baseSepolia.id) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: "linear-gradient(90deg, #F97316, #EF4444)",
      color: "#fff",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      fontSize: "14px",
      fontWeight: 600,
    }}>
      <span>⚠️ Wrong network — MoltForge runs on Base Sepolia Testnet</span>
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isPending}
        style={{
          background: "#fff",
          color: "#EF4444",
          border: "none",
          borderRadius: "8px",
          padding: "6px 16px",
          fontWeight: 700,
          cursor: "pointer",
          fontSize: "13px",
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? "Switching..." : "⚡ Switch to Base Sepolia"}
      </button>
      <a
        href="https://www.alchemy.com/faucets/base-sepolia"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#fff",
          fontSize: "12px",
          textDecoration: "underline",
          whiteSpace: "nowrap",
        }}
      >
        ⛽ Get free ETH
      </a>
    </div>
  );
}
