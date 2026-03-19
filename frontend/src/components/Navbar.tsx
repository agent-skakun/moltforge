"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const docsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // Close docs dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (docsRef.current && !docsRef.current.contains(e.target as Node)) {
        setDocsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const mainLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/tasks",       label: "Tasks" },
    { href: "/create-task", label: "Create Task" },
  ];

  const landingLinks = [
    { href: "#how",      label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#tiers",    label: "Tiers" },
    { href: "#agents",   label: "Agents" },
  ];

  const navLinkStyle = {
    fontSize: "0.85rem",
    color: "#5a807a",
    textDecoration: "none",
    fontFamily: "var(--font-inter)",
    transition: "color 0.15s",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
  } as const;

  return (
    <nav
      className="border-b border-forge-border bg-forge-dark/80 backdrop-blur-md sticky top-0 z-50"
      style={{ background: "#060c0b", borderBottom: "1px solid #182622" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Left: Logo + main nav ── */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
              <img
                src="https://moltforge-brandbook.vercel.app/assets/logo/moltforge-logo.svg"
                alt="MoltForge"
                style={{ height: 40, width: "auto" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span style={{ fontFamily: "var(--font-space-grotesk)", color: "#e4f0ee", fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.04em" }}>
                MoltForge
              </span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 6, background: "#f0782820", border: "1px solid #f0782860", color: "#f07828", fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase" }}>
                Testnet
              </span>
            </Link>

            {/* Desktop main links */}
            <div className="hidden md:flex items-center gap-6">
              {(isLanding ? landingLinks : mainLinks).map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  style={navLinkStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1db8a8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#5a807a")}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* ── Right: service links + wallet ── */}
          <div className="hidden md:flex items-center gap-3">
            {isLanding && (
              <>
                <Link
                  href="/marketplace"
                  style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-space-grotesk)", padding: "0.45rem 1.1rem", borderRadius: 10, border: "1px solid #223230", color: "#e4f0ee", textDecoration: "none", background: "transparent", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#111e1c")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Browse the Forge
                </Link>
                <Link
                  href="/create-task"
                  style={{ fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-space-grotesk)", padding: "0.45rem 1.1rem", borderRadius: 10, background: "#1db8a8", color: "#060c0b", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#40cfc3")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#1db8a8")}
                >
                  Post a Task →
                </Link>
              </>
            )}

            {/* Docs dropdown */}
            {!isLanding && (
              <div ref={docsRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setDocsOpen(!docsOpen)}
                  style={{ ...navLinkStyle, display: "flex", alignItems: "center", gap: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1db8a8")}
                  onMouseLeave={(e) => !docsOpen && (e.currentTarget.style.color = "#5a807a")}
                >
                  Docs
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                    style={{ transition: "transform 0.15s", transform: docsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {docsOpen && (
                  <div
                    style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 200, background: "#0a1513", border: "1px solid #182622", borderRadius: 12, padding: "6px", boxShadow: "0 8px 32px #00000060", zIndex: 100 }}
                    onMouseLeave={() => setDocsOpen(false)}
                  >
                    {[
                      { href: "/docs",            label: "📄 Documentation" },
                      { href: "/getting-started", label: "🚀 Getting Started" },
                      { href: "/mcp-connect",     label: "🔌 MCP Connect" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDocsOpen(false)}
                        style={{ display: "block", padding: "9px 12px", borderRadius: 8, fontSize: "0.83rem", color: "#8ab5af", textDecoration: "none", fontFamily: "var(--font-inter)", transition: "all 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#1db8a815"; e.currentTarget.style.color = "#e8f5f2"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8ab5af"; }}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dashboard */}
            {!isLanding && (
              <a
                href="/dashboard"
                style={navLinkStyle}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#1db8a8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#5a807a")}
              >
                Dashboard
              </a>
            )}

            {/* Faucet icon */}
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              title="Testnet Faucet"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#f0782815", border: "1px solid #f0782840", color: "#f07828", textDecoration: "none", fontSize: "1rem", transition: "all 0.15s", flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0782830"; e.currentTarget.style.borderColor = "#f0782870"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0782815"; e.currentTarget.style.borderColor = "#f0782840"; }}
            >
              ⛽
            </a>

            <ConnectButton showBalance={false} label="Connect Wallet" />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{ color: "#5a807a", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{ paddingBottom: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(isLanding ? landingLinks : [
                ...mainLinks,
                { href: "/docs",            label: "Documentation" },
                { href: "/getting-started", label: "Getting Started" },
                { href: "/mcp-connect",     label: "🔌 MCP Connect" },
                { href: "/dashboard",       label: "Dashboard" },
                { href: "https://www.alchemy.com/faucets/base-sepolia", label: "⛽ Testnet Faucet" },
              ]).map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: "0.875rem", color: "#5a807a", textDecoration: "none", fontFamily: "var(--font-inter)", padding: "0.25rem 0" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {isLanding && (
                <>
                  <Link href="/marketplace" style={{ fontSize: "0.875rem", color: "#1db8a8", textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
                    Browse the Forge →
                  </Link>
                  <Link href="/create-task" style={{ fontSize: "0.875rem", color: "#f07828", textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
                    Post a Task →
                  </Link>
                </>
              )}
              <ConnectButton showBalance={false} label="Connect Wallet" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
