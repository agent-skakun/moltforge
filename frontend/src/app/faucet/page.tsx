"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ eth?: { txHash?: string; error?: string }; usdc?: { txHash?: string; error?: string } } | null>(null);

  const claim = async () => {
    if (!address) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ eth: { error: String(e) } });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-20 px-4" style={{ background: "#060c0b" }}>
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e8f5f3" }}>
          ⛽ Testnet Faucet
        </h1>
        <p className="text-sm mb-8" style={{ color: "#3a5550" }}>
          Get free test ETH + mUSDC on Base Sepolia to try MoltForge
        </p>

        <div className="rounded-2xl p-6" style={{ background: "#0a1a17", border: "1px solid #1a2e2b" }}>
          {!isConnected ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: "#8ab5af" }}>Connect your wallet to claim tokens</p>
              <ConnectButton />
            </div>
          ) : (
            <div>
              <p className="text-xs mb-1" style={{ color: "#3a5550" }}>Connected wallet</p>
              <p className="text-sm font-mono mb-6" style={{ color: "#1db8a8" }}>{address}</p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-xl p-4" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                  <p className="text-xs mb-1" style={{ color: "#3a5550" }}>ETH (gas)</p>
                  <p className="text-lg font-bold" style={{ color: "#e8f5f3", fontFamily: "var(--font-jetbrains-mono)" }}>0.005</p>
                </div>
                <div className="flex-1 rounded-xl p-4" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                  <p className="text-xs mb-1" style={{ color: "#3a5550" }}>mUSDC</p>
                  <p className="text-lg font-bold" style={{ color: "#1db8a8", fontFamily: "var(--font-jetbrains-mono)" }}>10,000</p>
                </div>
              </div>

              <button
                onClick={claim}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: loading ? "#1a2e2b" : "linear-gradient(135deg, #f07828, #d05e10)",
                  color: loading ? "#3a5550" : "white",
                  fontFamily: "var(--font-space-grotesk)",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 0 20px #f0782840",
                }}
              >
                {loading ? "Claiming..." : "🔥 Claim ETH + mUSDC"}
              </button>

              {result && (
                <div className="mt-4 rounded-xl p-4 text-xs" style={{ background: "#060c0b", border: "1px solid #1a2e2b" }}>
                  {result.eth?.txHash && (
                    <p style={{ color: "#22c55e" }}>
                      ✅ ETH sent —{" "}
                      <a href={`https://sepolia.basescan.org/tx/${result.eth.txHash}`} target="_blank" rel="noreferrer" style={{ color: "#1db8a8" }}>
                        view tx ↗
                      </a>
                    </p>
                  )}
                  {result.eth?.error && <p style={{ color: "#ef4444" }}>❌ ETH: {result.eth.error}</p>}
                  {result.usdc?.txHash && (
                    <p className="mt-1" style={{ color: "#22c55e" }}>
                      ✅ 10,000 mUSDC sent —{" "}
                      <a href={`https://sepolia.basescan.org/tx/${result.usdc.txHash}`} target="_blank" rel="noreferrer" style={{ color: "#1db8a8" }}>
                        view tx ↗
                      </a>
                    </p>
                  )}
                  {result.usdc?.error && <p className="mt-1" style={{ color: "#ef4444" }}>❌ mUSDC: {result.usdc.error}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "#3a5550" }}>
          Base Sepolia testnet · mUSDC: <code style={{ color: "#1db8a8", fontSize: "0.65rem" }}>0x74e5bf2eceb346d9113c97161b1077ba12515a82</code>
        </p>
      </div>
    </div>
  );
}
