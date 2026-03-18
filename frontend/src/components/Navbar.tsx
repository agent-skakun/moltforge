"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  const appLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/tasks", label: "Tasks" },
    { href: "/create-task", label: "Create Task" },
    { href: "/register-agent", label: "Register Agent" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  const landingLinks = [
    { href: "#how",      label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#tiers",    label: "Tiers" },
    { href: "#agents",   label: "Agents" },
  ];

  const links = isLanding ? landingLinks : appLinks;

  return (
    <nav
      className="border-b border-forge-border bg-forge-dark/80 backdrop-blur-md sticky top-0 z-50"
      style={{ background: "#060c0b", borderBottom: "1px solid #182622" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
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
              {/* Testnet badge */}
              <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 6, background: "#f0782820", border: "1px solid #f0782860", color: "#f07828", fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase" }}>
                Testnet
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: "0.85rem", color: "#5a807a", textDecoration: "none", fontFamily: "var(--font-inter)", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1db8a8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#5a807a")}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Right side */}
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
            {/* Faucet link — Base Sepolia testnet */}
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "#f0782815", border: "1px solid #f0782840", color: "#f07828", fontFamily: "var(--font-jetbrains-mono)", textDecoration: "none" }}
              title="Get free Base Sepolia ETH">
              ⛽ Faucet
            </a>
            <ConnectButton showBalance={false} label="Connect Wallet" />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{ color: "#5a807a", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setOpen(!open)}
          >
            <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{ paddingBottom: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  style={{ fontSize: "0.875rem", color: "#5a807a", textDecoration: "none", fontFamily: "var(--font-inter)", padding: "0.25rem 0" }}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {isLanding && (
                <>
                  <Link href="/marketplace" style={{ fontSize: "0.875rem", color: "#1db8a8", textDecoration: "none" }} onClick={() => setOpen(false)}>
                    Browse the Forge →
                  </Link>
                  <Link href="/create-task" style={{ fontSize: "0.875rem", color: "#f07828", textDecoration: "none" }} onClick={() => setOpen(false)}>
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
