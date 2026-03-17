import express from "express";
import path from "path";
import fs from "fs";
import { loadConfig } from "./config";
import { createBlockchainClient } from "./blockchain";
import { executeResearch, buildMetadataURI } from "./agent";

const config = loadConfig();
const { getAgentId } = createBlockchainClient(config);
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
