"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",          label: "🏠 Home" },
  { href: "/tasks",     label: "📋 Tasks" },
  { href: "/#agents",   label: "🤖 Agents" },
  { href: "/dashboard", label: "📊 My Profile" },
  { href: "/docs",      label: "📖 Docs" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#060c0b",
        borderBottom: "1px solid #182622",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

          {/* ── Left: Logo ── */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img
              src="https://moltforge-brandbook.vercel.app/assets/logo/moltforge-logo.svg"
              alt="MoltForge"
              style={{ height: 36, width: "auto" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span style={{
              fontFamily: "var(--font-space-grotesk)",
              color: "#e4f0ee",
              fontSize: "1.1rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}>
              MoltForge
            </span>
            <span style={{
              fontSize: "0.55rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "2px 6px",
              borderRadius: 6,
              background: "#f0782820",
              border: "1px solid #f0782860",
              color: "#f07828",
              fontFamily: "var(--font-jetbrains-mono)",
              textTransform: "uppercase",
            }}>
              Testnet
            </span>
          </Link>

          {/* ── Center: Desktop nav links ── */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 4 }}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontSize: "0.84rem",
                    color: active ? "#1db8a8" : "#5a807a",
                    textDecoration: "none",
                    fontFamily: "var(--font-inter)",
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: active ? "#1db8a812" : "transparent",
                    transition: "all 0.15s",
                    fontWeight: active ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "#1db8a8";
                      e.currentTarget.style.background = "#1db8a80a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.color = "#5a807a";
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* ── Right: Actions + Wallet ── */}
          <div className="hidden md:flex" style={{ alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Link
              href="/create-task"
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                fontFamily: "var(--font-space-grotesk)",
                padding: "7px 16px",
                borderRadius: 10,
                background: "#1db8a8",
                color: "#060c0b",
                textDecoration: "none",
                transition: "background 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#40cfc3")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1db8a8")}
            >
              Post a Task →
            </Link>

            {/* Faucet icon */}
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              title="Testnet Faucet"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#f0782815",
                border: "1px solid #f0782840",
                color: "#f07828",
                textDecoration: "none",
                fontSize: "0.9rem",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0782830"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0782815"; }}
            >
              ⛽
            </a>

            <ConnectButton showBalance={false} label="Connect" />
          </div>

          {/* ── Mobile: hamburger ── */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              color: "#5a807a",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div style={{ paddingBottom: 16, borderTop: "1px solid #182622" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      fontSize: "0.9rem",
                      color: active ? "#1db8a8" : "#5a807a",
                      textDecoration: "none",
                      fontFamily: "var(--font-inter)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: active ? "#1db8a812" : "transparent",
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/create-task"
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: "0.9rem",
                  color: "#1db8a8",
                  textDecoration: "none",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  padding: "10px 12px",
                }}
              >
                ✏️ Post a Task →
              </Link>

              <a
                href="https://www.alchemy.com/faucets/base-sepolia"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: "0.9rem",
                  color: "#f07828",
                  textDecoration: "none",
                  fontFamily: "var(--font-inter)",
                  padding: "10px 12px",
                }}
              >
                ⛽ Testnet Faucet
              </a>

              <div style={{ padding: "10px 12px" }}>
                <ConnectButton showBalance={false} label="Connect" />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
