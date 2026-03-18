import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "process.env.GITHUB_TOKEN";
const REPO = "agent-skakun/moltforge-skills";
const BASE_RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const BASE_API = `https://api.github.com/repos/${REPO}`;

// Friendly labels and descriptions per skill file
const SKILL_META: Record<string, { label: string; desc: string }> = {
  "ai-compute/venice.md":               { label: "Venice AI",           desc: "Privacy-preserving AI inference via Venice API" },
  "blockchain/erc8004.md":              { label: "ERC-8004 Identity",   desc: "On-chain agent identity and registration standard" },
  "blockchain/ethskills.md":            { label: "Ethereum Dev",        desc: "Core Ethereum development skills and patterns" },
  "data-analytics/coingecko-full.md":   { label: "CoinGecko",           desc: "Crypto market data, prices and charts API" },
  "data-analytics/coinmarketcap.md":    { label: "CoinMarketCap",       desc: "Market cap rankings and token analytics" },
  "data-analytics/defillama-full.md":   { label: "DefiLlama",           desc: "DeFi TVL, protocol and chain analytics" },
  "data-analytics/dune.md":             { label: "Dune Analytics",      desc: "SQL-based on-chain data queries and dashboards" },
  "data-analytics/the-graph.md":        { label: "The Graph",           desc: "Decentralized indexing for blockchain data" },
  "defi-trading/aave.md":               { label: "Aave",                desc: "Decentralized lending and borrowing protocol" },
  "defi-trading/binance.md":            { label: "Binance",             desc: "CEX trading, spot and futures API" },
  "defi-trading/polymarket.md":         { label: "Polymarket",          desc: "Prediction market trading and position management" },
  "defi-trading/uniswap-v3-sdk.md":     { label: "Uniswap v3",          desc: "DEX swaps, liquidity and pool management" },
  "infrastructure/bankr.md":            { label: "Bankr Payments",      desc: "Agent payment infrastructure and billing" },
  "infrastructure/filecoin-ipfs.md":    { label: "Filecoin/IPFS",       desc: "Decentralized storage and content addressing" },
  "infrastructure/x402-payments.md":    { label: "x402 Payments",       desc: "HTTP-native micropayments protocol for agents" },
  "prediction-markets/polymarket-monitor.md": { label: "Polymarket Monitor", desc: "Real-time prediction market monitoring and alerts" },
  "research/twitter-monitor.md":        { label: "Twitter/X Monitor",   desc: "Social media monitoring and sentiment analysis" },
  "research/web-search.md":             { label: "Web Search",          desc: "Web research and information gathering" },
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";
  const filePath = searchParams.get("path");

  const headers: Record<string, string> = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "User-Agent": "MoltForge/1.0",
    Accept: "application/vnd.github.v3+json",
  };

  if (action === "list") {
    try {
      const res = await fetch(`${BASE_API}/git/trees/HEAD?recursive=1`, { headers });
      if (!res.ok) return NextResponse.json({ groups: buildStaticGroups() });
      const data = await res.json();

      interface TreeItem { type: string; path: string }
      const mdFiles: TreeItem[] = (data.tree || []).filter(
        (f: TreeItem) => f.type === "blob" && f.path.endsWith(".md") && f.path !== "README.md"
      );

      const groups: Record<string, { id: string; label: string; desc: string; path: string; category: string }[]> = {};
      for (const f of mdFiles) {
        const parts = f.path.split("/");
        const category = parts.length > 1 ? parts[0] : "general";
        const meta = SKILL_META[f.path];
        const filename = parts[parts.length - 1].replace(".md", "");
        const label = meta?.label ?? filename.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const desc = meta?.desc ?? "";

        if (!groups[category]) groups[category] = [];
        groups[category].push({ id: f.path, label, desc, path: f.path, category });
      }

      return NextResponse.json({ groups });
    } catch {
      return NextResponse.json({ groups: buildStaticGroups() });
    }
  }

  if (action === "file" && filePath) {
    try {
      const res = await fetch(`${BASE_RAW}/${filePath}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "MoltForge/1.0" },
      });
      if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const content = await res.text();
      return NextResponse.json({ path: filePath, content });
    } catch {
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// Static fallback if GitHub API is unavailable
function buildStaticGroups() {
  const groups: Record<string, { id: string; label: string; desc: string; path: string; category: string }[]> = {};
  for (const [path, meta] of Object.entries(SKILL_META)) {
    const category = path.split("/")[0];
    if (!groups[category]) groups[category] = [];
    groups[category].push({ id: path, label: meta.label, desc: meta.desc, path, category });
  }
  return groups;
}
