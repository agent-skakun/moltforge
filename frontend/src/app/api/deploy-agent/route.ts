import { NextResponse } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const RAILWAY_GQL = "https://backboard.railway.app/graphql/v2";
const GITHUB_REPO = "agent-skakun/moltforge"; // source repo for the agent
const ROOT_DIR    = "/reference-agent";

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
  railwayToken: string;
  projectId?: string;     // optional — create new if absent
  agentName: string;
  walletAddress: string;
  registryAddress: string;
  escrowAddress: string;
  rpcUrl: string;
  llmProvider?: string;   // claude | gpt4o | llama | custom
  llmApiKey?: string;
  systemPrompt?: string;
  agentSkills?: string;   // comma-separated skill paths
  agentTools?: string;
  agentSpecialization?: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let body: DeployRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    railwayToken,
    projectId: providedProjectId,
    agentName,
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

  if (!railwayToken || !agentName || !walletAddress) {
    return NextResponse.json(
      { error: "Missing required fields: railwayToken, agentName, walletAddress" },
      { status: 400 }
    );
  }

  try {
    // ── Step 1: Verify token + get/create project ──────────────────────────

    // If no projectId provided — create a new project
    let projectId = providedProjectId;
    let environmentId: string;

    if (!projectId) {
      const projData = await rw(railwayToken,
        `mutation CreateProject($input: ProjectCreateInput!) {
          projectCreate(input: $input) { id environments { edges { node { id name } } } }
        }`,
        { input: { name: `moltforge-${agentName.toLowerCase().replace(/\s+/g, "-")}` } }
      );
      const project = projData.projectCreate as { id: string; environments: { edges: { node: { id: string; name: string } }[] } };
      projectId = project.id;
      environmentId = project.environments.edges[0].node.id;
    } else {
      // Get production environment for existing project
      const envData = await rw(railwayToken,
        `query GetEnvs($projectId: String!) {
          environments(projectId: $projectId) { edges { node { id name } } }
        }`,
        { projectId }
      );
      const envs = (envData.environments as { edges: { node: { id: string; name: string } }[] }).edges;
      const prodEnv = envs.find(e => e.node.name === "production") ?? envs[0];
      if (!prodEnv) throw new Error("No environment found in project");
      environmentId = prodEnv.node.id;
    }

    // ── Step 2: Create service ─────────────────────────────────────────────

    const svcSlug = agentName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
    const svcData = await rw(railwayToken,
      `mutation CreateSvc($input: ServiceCreateInput!) {
        serviceCreate(input: $input) { id name }
      }`,
      { input: {
        projectId,
        name: svcSlug,
        source: { repo: GITHUB_REPO },
      }}
    );
    const serviceId = (svcData.serviceCreate as { id: string }).id;

    // ── Step 3: Configure instance (rootDirectory, healthcheck) ───────────

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

    // ── Step 4: Set environment variables ─────────────────────────────────

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
      ...(llmProvider     && llmProvider !== "custom" && { LLM_MODEL: LLM_MODEL_MAP[llmProvider] ?? llmProvider }),
      // Route API key to correct env var
      ...(llmApiKey && llmProvider === "claude"          && { ANTHROPIC_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "gpt4o"           && { OPENAI_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "gpt4omini"       && { OPENAI_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "llama"           && { GROQ_API_KEY: llmApiKey }),
      ...(llmApiKey && llmProvider === "custom"          && { OPENAI_API_KEY: llmApiKey }),
    };

    // Upsert all vars in parallel (Railway handles concurrent calls fine)
    await Promise.all(
      Object.entries(envVars).map(([name, value]) =>
        rw(railwayToken,
          `mutation VarUpsert($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
          { input: { projectId, environmentId, serviceId, name, value } }
        )
      )
    );

    // ── Step 5: Generate public domain ────────────────────────────────────

    const domainData = await rw(railwayToken,
      `mutation GenDomain($input: ServiceDomainCreateInput!) {
        serviceDomainCreate(input: $input) { domain }
      }`,
      { input: { environmentId, serviceId, targetPort: 3000 } }
    );
    const domain = (domainData.serviceDomainCreate as { domain: string }).domain;
    const agentUrl = `https://${domain}`;

    // ── Step 6: Trigger initial deploy ────────────────────────────────────

    // Re-deploy triggers automatically when source is set + vars changed.
    // Optionally force redeploy:
    try {
      await rw(railwayToken,
        `mutation Redeploy($serviceId: String!, $environmentId: String!) {
          serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
        }`,
        { serviceId, environmentId }
      );
    } catch { /* non-critical — build may auto-start */ }

    return NextResponse.json({
      ok: true,
      projectId,
      serviceId,
      environmentId,
      agentUrl,
      domain,
      dashboardUrl: `https://railway.com/project/${projectId}/service/${serviceId}`,
    });

  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    console.error("[deploy-agent]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
