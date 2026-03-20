import express from "express";
import path from "path";
import fs from "fs";
import { loadConfig } from "./config";
import { createBlockchainClient, checkClientTrust } from "./blockchain";
import { executeResearch, buildMetadataURI } from "./agent";
import { startTelegramBot } from "./telegram";
import { checkAgentTrust } from "./trust";
import { logExecution, createInputHash, createResultHash } from "./execution-log";
import {
  issueChallenge,
  verifyRegistrationSignature,
  registerOnChain,
  generateAvatarTraits,
  renderAvatarSvg,
} from "./self-register";
import type { RegisterRequest } from "./self-register";

const config = loadConfig();
const { getAgentId, getAgentExtended, submitResult } = createBlockchainClient(config);
const app = express();

app.use(express.json());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PAYMENT");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

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
      url: agentUrl || `https://agent.moltforge.cloud`,
      provider: {
        name: "MoltForge",
        url: "https://moltforge.cloud",
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
  // ERC-8004 trust check (non-blocking, log only)
  const trust = await checkClientTrust(req.body?.clientWallet ?? "").catch(() => ({
    trusted: true,
    reason: "skipped",
    score: 0,
  }));
  console.log("[erc8004-trust-check]", trust);

  const { query, systemPrompt, skills: requestSkills, apiKey, llmProvider, taskId, agentAddress } = req.body as {
    query?: string;
    systemPrompt?: string;
    skills?: string[];
    apiKey?: string;           // user's own LLM API key (passed per-request, never stored)
    llmProvider?: string;      // "anthropic" | "openai" | "groq"
    taskId?: number | string;  // on-chain task ID (optional — if provided, submitResult() is called)
    agentAddress?: string;     // optional — if provided, ERC-8004 trust-gating is applied
  };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query (string) is required" });
    return;
  }

  // Optional ERC-8004 trust-gating: if agentAddress is provided, verify trust
  if (agentAddress) {
    const trustResult = await checkAgentTrust(agentAddress, config.registryAddress, config.rpcUrl);
    if (!trustResult.trusted) {
      logExecution({ taskId: taskId ?? null, decision: "rejected-untrusted", toolsUsed: [], inputHash: createInputHash(query || ""), resultHash: "0x00000000", durationMs: 0, trustCheck: { trusted: false, score: trustResult.score, agentAddress } });
      res.status(403).json({ error: "Agent not trusted", trust: trustResult });
      return;
    }
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
        // Per-request key overrides env vars — user pays with their own key
        openaiApiKey:    (llmProvider === "openai"    ? apiKey : undefined) ?? config.openaiApiKey,
        anthropicApiKey: (llmProvider === "anthropic" ? apiKey : undefined) ?? config.anthropicApiKey,
        groqApiKey:      (llmProvider === "groq"      ? apiKey : undefined) ?? config.groqApiKey,
        model: config.llmModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });
    const metadataURI = buildMetadataURI(report);

    // Auto-submit on-chain if taskId was provided
    let onChainTxHash: string | null = null;
    if (taskId !== undefined && taskId !== null) {
      try {
        const id = BigInt(taskId);
        onChainTxHash = await submitResult(id, metadataURI);
      } catch (onChainErr) {
        console.error(`[on-chain] submitResult failed for taskId=${taskId}:`, (onChainErr as Error).message);
        // Non-fatal: return result anyway, log the error
      }
    }

    logExecution({ taskId: taskId ?? null, decision: "executed", toolsUsed: ["executeResearch", "buildMetadataURI"], inputHash: createInputHash(query), resultHash: createResultHash(JSON.stringify(report)), durationMs: 0 });
    res.json({ report, metadataURI, onChainTxHash });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── x402 Payment Endpoints ──────────────────────────────────────────────────

// GET /x402-info — pricing info for x402 protocol
app.get("/x402-info", (_req, res) => {
  res.json({
    protocol: "x402",
    description: "Pay-per-task research agent via x402 HTTP payment protocol",
    pricing: {
      currency: "USDC",
      amount: "1.00",
      network: "base",
      chainId: 8453,
      recipient: config.walletAddress,
    },
    endpoint: "/tasks/x402",
    method: "POST",
    headers: {
      "X-PAYMENT": "Base64-encoded payment payload (x402 protocol)",
    },
  });
});

// POST /tasks/x402 — x402 payment-gated task execution (mock flow for hackathon)
app.post("/tasks/x402", async (req, res) => {
  const paymentHeader = req.headers["x-payment"] as string | undefined;

  // If no payment header, return 402 with payment instructions
  if (!paymentHeader) {
    res.status(402).json({
      error: "Payment Required",
      protocol: "x402",
      paymentInstructions: {
        currency: "USDC",
        amount: "1.00",
        network: "base",
        chainId: 8453,
        recipient: config.walletAddress,
        description: "Send 1 USDC on Base to execute a research task",
        header: "X-PAYMENT",
        format: "Include Base64-encoded payment proof in X-PAYMENT header",
      },
    });
    return;
  }

  // Payment header present — accept for demo (mock verification)
  console.log(`[x402] Payment header received: ${paymentHeader.slice(0, 32)}...`);

  const { query, systemPrompt, skills: requestSkills, apiKey, llmProvider, taskId } = req.body as {
    query?: string;
    systemPrompt?: string;
    skills?: string[];
    apiKey?: string;
    llmProvider?: string;
    taskId?: number | string;
  };

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query (string) is required" });
    return;
  }

  try {
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
        openaiApiKey:    (llmProvider === "openai"    ? apiKey : undefined) ?? config.openaiApiKey,
        anthropicApiKey: (llmProvider === "anthropic" ? apiKey : undefined) ?? config.anthropicApiKey,
        groqApiKey:      (llmProvider === "groq"      ? apiKey : undefined) ?? config.groqApiKey,
        model: config.llmModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });
    const metadataURI = buildMetadataURI(report);

    let onChainTxHash: string | null = null;
    if (taskId !== undefined && taskId !== null) {
      try {
        const id = BigInt(taskId);
        onChainTxHash = await submitResult(id, metadataURI);
      } catch (onChainErr) {
        console.error(`[on-chain] submitResult failed for taskId=${taskId}:`, (onChainErr as Error).message);
      }
    }

    logExecution({ taskId: taskId ?? null, decision: "executed-x402", toolsUsed: ["executeResearch", "buildMetadataURI"], inputHash: createInputHash(query), resultHash: createResultHash(JSON.stringify(report)), durationMs: 0 });
    res.json({ report, metadataURI, onChainTxHash, payment: { accepted: true, protocol: "x402" } });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Trust Check Endpoint ────────────────────────────────────────────────────

// GET /trust-check?address=0x... — ERC-8004 trust assessment
app.get("/trust-check", async (req, res) => {
  const address = req.query.address as string | undefined;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    res.status(400).json({ error: "address query parameter (0x... format) is required" });
    return;
  }
  const assessment = await checkAgentTrust(address, config.registryAddress, config.rpcUrl);
  res.json({ address, ...assessment });
});

// ─── Agent Self-Registration API ─────────────────────────────────────────────

/**
 * POST /api/challenge
 * Body: { wallet: "0x..." }
 * Returns: { nonce, expiresIn }
 * Step 1: agent requests a nonce to sign (TTL 10 min)
 */
app.post("/api/challenge", (req, res) => {
  const { wallet } = req.body as { wallet?: string };
  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    res.status(400).json({ error: "wallet (0x address) is required" });
    return;
  }
  const nonce = issueChallenge(wallet as `0x${string}`);
  res.json({ nonce, expiresIn: 600, message: "Sign this nonce with your wallet private key, then POST to /api/register" });
});

/**
 * POST /api/register
 * Body: { nonce, wallet, signature, name, skills?, tools?, webhookUrl?, agentUrl?, llmProvider?, metadataURI? }
 * Returns: { ok, numericId, wallet, agentIdHash, txHash, avatarSvg, avatarTraits, marketplaceUrl }
 * Step 2: verify sig → register on-chain → generate avatar → return result
 */
app.post("/api/register", async (req, res) => {
  const body = req.body as RegisterRequest;
  const { nonce, wallet, signature, name, skills = [], tools = [], webhookUrl = "", agentUrl = "" } = body;

  // Validate
  if (!nonce || !wallet || !signature || !name) {
    res.status(400).json({ error: "nonce, wallet, signature, name are required" });
    return;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    res.status(400).json({ error: "invalid wallet address" });
    return;
  }
  if (name.trim().length < 2 || name.trim().length > 64) {
    res.status(400).json({ error: "name must be 2–64 characters" });
    return;
  }

  // Verify signature (also consumes the nonce — one-time use)
  const sigValid = await verifyRegistrationSignature(nonce, wallet as `0x${string}`, signature as `0x${string}`);
  if (!sigValid) {
    res.status(401).json({ error: "Invalid signature — get a fresh nonce from POST /api/challenge" });
    return;
  }

  // Generate deterministic avatar from name + skills
  const traits    = generateAvatarTraits(name.trim(), skills);
  const avatarSvg = renderAvatarSvg(traits, name.trim());
  const avatarDataURI = `data:image/svg+xml;base64,${Buffer.from(avatarSvg).toString("base64")}`;

  // Deployer key (server-side, submits the on-chain tx on behalf of agent)
  const deployerPrivateKey = (process.env.PRIVATE_KEY ?? "") as `0x${string}`;
  if (!deployerPrivateKey || deployerPrivateKey.length < 10) {
    res.status(503).json({ error: "Server not configured for on-chain registration (missing PRIVATE_KEY)" });
    return;
  }

  // Build metadata JSON
  const meta = {
    name: name.trim(),
    description: `AI agent on MoltForge. Skills: ${skills.join(", ") || "general"}`,
    image: avatarDataURI,
    skills,
    tools,
    llmProvider: body.llmProvider ?? "unknown",
    webhookUrl:  agentUrl || webhookUrl,
    registeredAt: new Date().toISOString(),
    platform: "MoltForge",
    selfRegistered: true,
  };
  const finalMetaURI = body.metadataURI
    ?? `data:application/json;base64,${Buffer.from(JSON.stringify(meta)).toString("base64")}`;

  // Register on-chain
  try {
    const { numericId, txHash, agentIdHash } = await registerOnChain({
      registryAddress:    config.registryAddress,
      deployerPrivateKey,
      rpcUrl:             config.rpcUrl,
      agentWallet:        wallet as `0x${string}`,
      agentName:          name.trim(),
      metadataURI:        finalMetaURI,
      webhookUrl:         agentUrl || webhookUrl,
    });

    console.log(`[self-register] ✅ "${name}" #${numericId} wallet=${wallet} tx=${txHash}`);

    res.json({
      ok:           true,
      numericId:    numericId.toString(),
      wallet,
      agentIdHash,
      txHash,
      avatarSvg,
      avatarTraits: traits,
      metadataURI:  finalMetaURI,
      marketplaceUrl: `https://moltforge.cloud/agent/${numericId}`,
    });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[self-register] ❌ "${name}":`, msg);
    res.status(400).json({ error: msg });
  }
});

// ─── x402 Paid Endpoint ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { paymentMiddleware } = require("x402-express") as {
  paymentMiddleware: (
    payTo: string,
    routes: Record<string, { price: string; network: string }>,
    facilitator?: { url: string },
  ) => (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;
};

app.use(
  paymentMiddleware(
    config.walletAddress,
    {
      "/api/task-preview/:taskId": {
        price: "$0.001",
        network: "base-sepolia",
      },
    },
  ),
);

// GET /api/task-preview/:taskId — paid task preview (x402: 0.001 USDC)
app.get("/api/task-preview/:taskId", (_req, res) => {
  const taskId = _req.params.taskId;
  // In a real implementation this would look up the task from storage
  const placeholder = `Preview for task #${taskId}. This agent provides AI research services via MoltForge marketplace. Submit a full task request to POST /tasks to get started.`;
  res.json({
    taskId,
    preview: placeholder.slice(0, 100),
    note: "Full task details available after payment via x402 protocol",
  });
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

  // Start Telegram bot if token is configured
  if (config.telegramBotToken) {
    startTelegramBot(config, {
      openaiApiKey:    config.openaiApiKey,
      anthropicApiKey: config.anthropicApiKey,
      groqApiKey:      config.groqApiKey,
      model:           config.llmModel,
      temperature:     config.temperature,
      maxTokens:       config.maxTokens,
    });
  }
});
