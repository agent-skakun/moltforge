import { NextResponse } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const RAILWAY_GQL = "https://backboard.railway.app/graphql/v2";
const GITHUB_REPO = "agent-skakun/moltforge"; // source repo for the agent
const ROOT_DIR    = "/reference-agent";
// MoltForge's Railway project — all agents deployed here
const MOLTFORGE_PROJECT_ID = "cb260e6f-8ca6-4f0e-bf99-99f75e70c9ad";

// ─── Railway GQL helper ───────────────────────────────────────────────────────

async function rw(token: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json() as { data?: Record<string, unknown>; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data!;
}

// ─── Request body type ────────────────────────────────────────────────────────

interface DeployRequest {
  agentName: string;
  agentNumericId?: string;   // on-chain ID, used for unique service name
  walletAddress: string;
  registryAddress: string;
  escrowAddress: string;
  rpcUrl?: string;
  llmProvider?: string;
  llmApiKey?: string;        // user's own LLM API key (Anthropic / OpenAI / Groq)
  systemPrompt?: string;
  agentSkills?: string;
  agentTools?: string;
  agentSpecialization?: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Use MoltForge's server-side Railway token — never exposed to browser
  const railwayToken = process.env.RAILWAY_API_TOKEN;
  if (!railwayToken) {
    return NextResponse.json({ ok: false, error: "Railway not configured on server" }, { status: 503 });
  }

  let body: DeployRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    agentName,
    agentNumericId,
    walletAddress,
    registryAddress,
    escrowAddress,
    rpcUrl,
    llmProvider,
    llmApiKey,
    systemPrompt,
    agentSkills,
    agentTools,
    agentSpecialization,
  } = body;

  if (!agentName || !walletAddress) {
    return NextResponse.json(
      { error: "Missing required fields: agentName, walletAddress" },
      { status: 400 }
    );
  }

  try {
    // ── Step 1: Get production environment for MoltForge project ──────────

    const envData = await rw(railwayToken,
      `query GetEnvs($projectId: String!) {
        environments(projectId: $projectId) { edges { node { id name } } }
      }`,
      { projectId: MOLTFORGE_PROJECT_ID }
    );
    const envs = (envData.environments as { edges: { node: { id: string; name: string } }[] }).edges;
    const prodEnv = envs.find(e => e.node.name === "production") ?? envs[0];
    if (!prodEnv) throw new Error("No environment found in MoltForge Railway project");
    const environmentId = prodEnv.node.id;

    // ── Step 2: Create service with unique name ────────────────────────────
    // Format: mf-agent-<numericId> or mf-agent-<slug>
    const slug = agentNumericId
      ? `mf-agent-${agentNumericId}`
      : `mf-agent-${agentName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 32)}-${Date.now().toString(36)}`;

    const svcData = await rw(railwayToken,
      `mutation CreateSvc($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name }
      }`,
      { input: {
        projectId: MOLTFORGE_PROJECT_ID,
        name: slug,
        source: { repo: GITHUB_REPO },
      }}
    );
    const serviceId = (svcData.serviceCreate as { id: string }).id;

    // ── Step 3: Configure instance ─────────────────────────────────────────

    await rw(railwayToken,
      `mutation UpdateInstance($environmentId: String!, $serviceId: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(environmentId: $environmentId, serviceId: $serviceId, input: $input)
      }`,
      {
        environmentId,
        serviceId,
        input: {
          rootDirectory: ROOT_DIR,
          healthcheckPath: "/health",
          healthcheckTimeout: 30,
        },
      }
    );

    // ── Step 4: Set environment variables ──────────────────────────────────

    const LLM_MODEL_MAP: Record<string, string> = {
      claude:    "claude-3-5-sonnet-20241022",
      gpt4o:     "gpt-4o",
      gpt4omini: "gpt-4o-mini",
      llama:     "llama-3.3-70b-versatile",
    };

    const envVars: Record<string, string> = {
      PORT:             "3000",
      WALLET_ADDRESS:   walletAddress,
      REGISTRY_ADDRESS: registryAddress,
      ESCROW_ADDRESS:   escrowAddress,
      RPC_URL:          rpcUrl || "https://mainnet.base.org",
      AGENT_NAME:       agentName,
      AGENT_SPECIALIZATION: agentSpecialization || "research",
      ...(agentSkills     && { AGENT_SKILLS: agentSkills }),
      ...(agentTools      && { AGENT_TOOLS: agentTools }),
      ...(systemPrompt    && { SYSTEM_PROMPT: systemPrompt }),
      ...(llmProvider && llmProvider !== "custom" && { LLM_MODEL: LLM_MODEL_MAP[llmProvider] ?? llmProvider }),
      ...(llmApiKey && llmProvider === "claude"    && { ANTHROPIC_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "gpt4o"     && { OPENAI_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "gpt4omini" && { OPENAI_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "llama"     && { GROQ_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "custom"    && { OPENAI_API_KEY: llmApiKey }),
    };

    await Promise.all(
      Object.entries(envVars).map(([name, value]) =>
        rw(railwayToken,
          `mutation VarUpsert($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
          { input: { projectId: MOLTFORGE_PROJECT_ID, environmentId, serviceId, name, value } }
        )
      )
    );

    // ── Step 5: Generate public domain ─────────────────────────────────────

    const domainData = await rw(railwayToken,
      `mutation GenDomain($input: ServiceDomainCreateInput!) {
        serviceDomainCreate(input: $input) { domain }
      }`,
      { input: { environmentId, serviceId, targetPort: 3000 } }
    );
    const domain = (domainData.serviceDomainCreate as { domain: string }).domain;
    const agentUrl = `https://${domain}`;

    // ── Step 6: Trigger deploy ─────────────────────────────────────────────

    try {
      await rw(railwayToken,
        `mutation Redeploy($serviceId: String!, $environmentId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
        }`,
        { serviceId, environmentId }
      );
    } catch { /* non-critical */ }

    return NextResponse.json({
      ok: true,
      serviceId,
      agentUrl,
      domain,
      dashboardUrl: `https://railway.com/project/${MOLTFORGE_PROJECT_ID}/service/${serviceId}`,
    });

  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    console.error("[deploy-agent]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

