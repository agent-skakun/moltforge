import express from "express";
import path from "path";
import { loadConfig } from "./config";
import { createBlockchainClient } from "./blockchain";
import { executeResearch, buildMetadataURI } from "./agent";

const config = loadConfig();
const { getAgentId } = createBlockchainClient(config);
const app = express();

app.use(express.json());

// Serve .well-known/agent-card.json via static files
app.use(express.static(path.join(__dirname, "..", "public")));

// GET /agent.json — ERC-8004 registration file
app.get("/agent.json", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "agent.json"));
});

// GET /health
app.get("/health", async (_req, res) => {
  let agentId: string;
  try {
    const id = await getAgentId();
    agentId = id === 0n ? "not-registered" : id.toString();
  } catch {
    agentId = "read-error";
  }

  res.json({
    status: "ok",
    wallet: config.walletAddress,
    agentId,
    timestamp: new Date().toISOString(),
  });
});

// POST /tasks — execute research
app.post("/tasks", async (req, res) => {
  const { query } = req.body as { query?: string };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query (string) is required" });
    return;
  }

  try {
    const report = await executeResearch(query);
    const metadataURI = buildMetadataURI(report);
    res.json({ report, metadataURI });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(config.port, () => {
  console.log(`MoltForge ResearchAgent running on http://localhost:${config.port}`);
  console.log(`  Wallet:   ${config.walletAddress}`);
  console.log(`  Registry: ${config.registryAddress}`);
  console.log(`  A2A Card: http://localhost:${config.port}/.well-known/agent-card.json`);
});
