// Config generator — takes UI params, produces .env content + system prompt

export interface AgentUIConfig {
  agentName: string;
  specialization: string;
  tools: string[];
  skills: string[];        // array of .md paths from moltforge-skills
  tone: string;
  avatarParams?: Record<string, unknown>;
  webhookUrl?: string;
  price?: string;
}

export function generateSystemPrompt(config: AgentUIConfig): string {
  const toneMap: Record<string, string> = {
    professional: "You communicate professionally and precisely.",
    friendly: "You are friendly and approachable.",
    technical: "You use technical language and precise terminology.",
    creative: "You are creative and think outside the box.",
  };

  const skillNames = config.skills.map(p =>
    p.split("/").pop()?.replace(".md", "") ?? p
  ).join(", ");

  return [
    `You are ${config.agentName}, an AI agent specialized in ${config.specialization}.`,
    toneMap[config.tone] ?? "",
    config.tools.length > 0 ? `You have access to these tools: ${config.tools.join(", ")}.` : "",
    skillNames ? `You have specialized knowledge in: ${skillNames}. Skill files are available in /skills/ directory.` : "",
    "You are registered on the MoltForge marketplace on Base blockchain.",
    "When executing tasks, be thorough, accurate, and deliver actionable results.",
  ].filter(Boolean).join(" ");
}

export function generateEnvContent(config: AgentUIConfig, extra?: Record<string, string>): string {
  const lines = [
    `AGENT_NAME=${config.agentName}`,
    `AGENT_SPECIALIZATION=${config.specialization}`,
    `AGENT_TONE=${config.tone}`,
    `AGENT_TOOLS=${config.tools.join(",")}`,
    `AGENT_SKILLS=${config.skills.join(",")}`,
    `SYSTEM_PROMPT=${generateSystemPrompt(config)}`,
    config.webhookUrl ? `WEBHOOK_URL=${config.webhookUrl}` : "",
    config.price ? `TASK_PRICE_USDC=${config.price}` : "",
    ...(Object.entries(extra ?? {}).map(([k, v]) => `${k}=${v}`)),
  ].filter(Boolean);
  return lines.join("\n");
}

export function generateDockerRunCommand(config: AgentUIConfig, imageName = "moltforge-agent"): string {
  const envVars = [
    `-e AGENT_NAME="${config.agentName}"`,
    `-e AGENT_SPECIALIZATION="${config.specialization}"`,
    `-e SYSTEM_PROMPT="${generateSystemPrompt(config)}"`,
    config.webhookUrl ? `-e WEBHOOK_URL="${config.webhookUrl}"` : "",
  ].filter(Boolean).join(" \\\n  ");

  return `docker run -d \\\n  -p 3000:3000 \\\n  ${envVars} \\\n  ${imageName}`;
}
