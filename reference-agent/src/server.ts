import express from "express";
import path from "path";
import fs from "fs";
import { loadConfig } from "./config";
import { createBlockchainClient } from "./blockchain";
import { executeResearch, buildMetadataURI } from "./agent";

const config = loadConfig();
const { getAgentId, getAgentExtended } = createBlockchainClient(config);
const app = express();

app.use(express.json());

// ─── Skills loader ────────────────────────────────────────────────────────────
const SKILLS_DIR = "/skills";
const SKILLS_RAW_BASE = "https://raw.githubusercontent.com/agent-skakun/moltforge-skills/main";
let skillsContext = "";
let loadedSkillFiles: string[] = [];

function loadSkillsFromDisk() {
  if (!fs.existsSync(SKILLS_DIR)) return;
  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith(".md"));
  const parts: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, file), "utf-8");
    parts.push(`--- ${file} ---\n${content}`);
  }
  loadedSkillFiles = files;
  skillsContext = parts.join("\n\n");
  if (files.length > 0) {
    console.log(`[skills] Loaded ${files.length} skill files from ${SKILLS_DIR}`);
  }
}

loadSkillsFromDisk();

async function fetchSkillsFromGitHub(skillPaths: string[]): Promise<string> {
  const parts: string[] = [];
  for (const sp of skillPaths) {
    try {
      const url = `${SKILLS_RAW_BASE}/${sp}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const text = await resp.text();
        const name = sp.split("/").pop() ?? sp;
        parts.push(`--- ${name} ---\n${text}`);
      }
    } catch {
      // skip unreachable skills
    }
  }
  return parts.join("\n\n");
}

// ─── Agent config (in-memory) ─────────────────────────────────────────────────
interface AgentConfig {
  name?: string;
  specialization?: string;
  tools?: string[];
  skills?: string[];
  tone?: string;
  avatarParams?: Record<string, unknown>;
}

let agentConfig: AgentConfig = {
  name: config.agentName,
  specialization: config.specialization,
  tools: config.tools,
  skills: config.skills,
  tone: config.tone,
};

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "..", "public")));

// GET /agent.json — Dynamic ERC-8004 registration file (merges on-chain + config)
app.get("/agent.json", async (_req, res) => {
  try {
    // Read static base
    const staticPath = path.join(__dirname, "..", "agent.json");
    const staticBase = fs.existsSync(staticPath)
      ? JSON.parse(fs.readFileSync(staticPath, "utf-8"))
      : {};

    // Enrich with on-chain + in-memory config
    const onChain = await getAgentExtended(config.walletAddress).catch(() => null);
    const name = agentConfig.name ?? config.agentName ?? staticBase.name ?? "MoltForge Agent";
    const skills = onChain?.skills ?? agentConfig.skills ?? config.skills ?? [];
    const tools = onChain?.tools ?? agentConfig.tools ?? config.tools ?? [];
    const agentUrl = onChain?.agentUrl ?? staticBase.services?.[0]?.endpoint ?? "";
    const numericId = onChain?.numericId?.toString() ?? null;
    const avatarHash = onChain?.avatarHash ?? null;

    const dynamic = {
      ...staticBase,
      name,
      description: staticBase.description ?? `AI agent specialized in ${agentConfig.specialization ?? "research"}.`,
      agentId: numericId ? `#${numericId}` : staticBase.agentId,
      agentIdHash: onChain?.agentId ?? null,
      walletAddress: config.walletAddress,
      agentUrl: agentUrl || undefined,
      specialization: agentConfig.specialization ?? config.specialization,
      skills,
      tools,
      avatarHash,
      updatedAt: new Date().toISOString(),
      registrations: onChain
        ? [{ agentId: numericId, numericId: onChain.numericId.toString(), agentRegistry: `eip155:8453:${config.registryAddress}` }]
        : staticBase.registrations,
    };

    res.json(dynamic);
  } catch (err) {
    // Fallback to static file
    res.sendFile(path.join(__dirname, "..", "agent.json"));
  }
});

// GET /agent-card — A2A card per ERC-8004 standard
app.get("/agent-card", async (_req, res) => {
  try {
    const onChain = await getAgentExtended(config.walletAddress).catch(() => null);
    const name = agentConfig.name ?? config.agentName ?? "MoltForge Agent";
    const specialization = agentConfig.specialization ?? config.specialization ?? "research";
    const skills = onChain?.skills ?? agentConfig.skills ?? config.skills ?? [];
    const tools = onChain?.tools ?? agentConfig.tools ?? config.tools ?? [];
    const agentUrl = onChain?.agentUrl ?? "";
    const numericId = onChain?.numericId?.toString() ?? null;

    const card = {
      "@type": "https://eips.ethereum.org/EIPS/eip-8004#a2a-card-v1",
      name,
      description: `AI agent specialized in ${specialization}. Registered on MoltForge marketplace.`,
      url: agentUrl || `https://moltforge-agent.vercel.app`,
      provider: {
        name: "MoltForge",
        url: "https://moltforge.vercel.app",
        registry: `eip155:8453:${config.registryAddress}`,
      },
      version: "1.0.0",
      protocolVersion: "0.3.0",
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      defaultInputModes: ["text/plain", "application/json"],
      defaultOutputModes: ["application/json"],
      skills: skills.map((s: string) => ({
        id: s,
        name: s.split("/").pop()?.replace(".md", "") ?? s,
        description: `Skill from moltforge-skills: ${s}`,
        tags: [s.split("/")[0] ?? "general"],
        examples: [`Research using ${s.split("/").pop()?.replace(".md", "") ?? s} knowledge`],
      })),
      tools: tools.map((t: string) => ({ id: t, name: t })),
      authentication: { schemes: [] },
      onChain: {
        numericId,
        wallet: config.walletAddress,
        registry: config.registryAddress,
        network: "base",
        avatarHash: onChain?.avatarHash ?? null,
      },
      generatedAt: new Date().toISOString(),
    };

    // Also serve at standard A2A path
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /.well-known/agent-card.json — standard A2A discovery path (proxies to /agent-card)
app.get("/.well-known/agent-card.json", async (req, res) => {
  // Forward to /agent-card handler by redirecting internally
  req.url = "/agent-card";
  app._router.handle(req, res, () => {});
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

// GET /skills — list loaded skill files
app.get("/skills", (_req, res) => {
  res.json({ loaded: loadedSkillFiles, count: loadedSkillFiles.length });
});

// POST /tasks — execute research
app.post("/tasks", async (req, res) => {
  const { query, systemPrompt, skills: requestSkills } = req.body as {
    query?: string;
    systemPrompt?: string;
    skills?: string[];
  };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query (string) is required" });
    return;
  }

  try {
    // Build combined skills context
    let combinedSkills = skillsContext;
    if (requestSkills && requestSkills.length > 0) {
      const fetched = await fetchSkillsFromGitHub(requestSkills);
      if (fetched) {
        combinedSkills = combinedSkills ? `${combinedSkills}\n\n${fetched}` : fetched;
      }
    }

    const report = await executeResearch(query, {
      systemPrompt: systemPrompt ?? config.systemPrompt,
      skillsContext: combinedSkills || undefined,
      llmConfig: {
        openaiApiKey: config.openaiApiKey,
        anthropicApiKey: config.anthropicApiKey,
        groqApiKey: config.groqApiKey,
        model: config.llmModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });
    const metadataURI = buildMetadataURI(report);
    res.json({ report, metadataURI });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /config — accept agent config
app.post("/config", (req, res) => {
  const { name, specialization, tools, skills, tone, avatarParams } = req.body as AgentConfig;
  agentConfig = { ...agentConfig, name, specialization, tools, skills, tone, avatarParams };
  res.json({ status: "ok", config: agentConfig });
});

// GET /agent-config — return current config
app.get("/agent-config", (_req, res) => {
  res.json(agentConfig);
});

app.listen(config.port, () => {
  console.log(`MoltForge ResearchAgent running on http://localhost:${config.port}`);
  console.log(`  Wallet:   ${config.walletAddress}`);
  console.log(`  Registry: ${config.registryAddress}`);
  console.log(`  A2A Card: http://localhost:${config.port}/.well-known/agent-card.json`);
  if (loadedSkillFiles.length > 0) {
    console.log(`  Skills:   ${loadedSkillFiles.length} loaded from ${SKILLS_DIR}`);
  }
});
