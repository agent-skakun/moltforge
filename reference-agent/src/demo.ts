import { loadConfig } from "./config";
import { createBlockchainClient } from "./blockchain";
import { executeResearch, buildMetadataURI } from "./agent";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // 1. Load config
  const config = loadConfig();
  console.log("=== MoltForge ResearchAgent Demo ===\n");
  console.log(`Wallet: ${config.walletAddress}`);
  console.log(`Registry: ${config.registryAddress}\n`);

  // 2. Read agentId from chain
  const { getAgentId } = createBlockchainClient(config);
  try {
    const agentId = await getAgentId();
    if (agentId === 0n) {
      console.log("On-chain status: NOT REGISTERED (agentId = 0)");
      console.log("  Agent wallet is not yet registered on-chain.\n");
    } else {
      console.log(`On-chain status: REGISTERED (agentId = ${agentId})\n`);
    }
  } catch (err) {
    console.log(`On-chain read error: ${(err as Error).message}\n`);
  }

  // 3. Execute research
  const query = "AI agent reputation blockchain 2025";
  const report = await executeResearch(query);

  console.log(`\nQuery: "${report.query}"`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Results: ${report.results.length}\n`);
  for (const [i, r] of report.results.entries()) {
    console.log(`  [${i + 1}] ${r.title}`);
    console.log(`      ${r.url}`);
    if (r.snippet) console.log(`      ${r.snippet.slice(0, 120)}...`);
    console.log();
  }
  console.log(`Summary: ${report.summary}\n`);

  // 4. Show data URI preview
  const metadataURI = buildMetadataURI(report);
  console.log("Metadata URI preview (first 100 chars):");
  console.log(`  ${metadataURI.slice(0, 100)}...\n`);

  // 5. Print agent.json
  const agentJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "agent.json"), "utf-8")
  );
  console.log("agent.json (ERC-8004):");
  console.log(JSON.stringify(agentJson, null, 2));
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
