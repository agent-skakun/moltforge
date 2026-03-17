"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/create-task", label: "Create Task" },
    { href: "/register-agent", label: "Register Agent" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <nav className="border-b border-forge-border bg-forge-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="https://moltforge-brandbook.vercel.app/assets/logo/moltforge-logo.svg"
                alt="MoltForge"
                className="h-10 w-auto"
              />
              <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)", color: "#e4f0ee", letterSpacing: "-0.04em" }}>
                MoltForge
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-forge-white/60 hover:text-teal-300 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <ConnectButton showBalance={false} label="Connect Wallet" />
          </div>
          <button
            className="md:hidden text-forge-white/60"
            onClick={() => setOpen(!open)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {open && (
          <div className="md:hidden pb-4 space-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block text-sm text-forge-white/60 hover:text-teal-300 py-1"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2">
              <ConnectButton showBalance={false} label="Connect Wallet" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
