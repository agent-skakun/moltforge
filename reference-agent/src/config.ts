import dotenv from "dotenv";
import { type Address } from "viem";

dotenv.config();

export interface Config {
  walletAddress: Address;
  registryAddress: Address;
  escrowAddress: Address;
  rpcUrl: string;
  port: number;
  agentName?: string;
  specialization?: string;
  systemPrompt?: string;
  tools?: string[];
  skills?: string[];
  tone?: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    walletAddress: requireEnv("WALLET_ADDRESS") as Address,
    registryAddress: requireEnv("REGISTRY_ADDRESS") as Address,
    escrowAddress: requireEnv("ESCROW_ADDRESS") as Address,
    rpcUrl: requireEnv("RPC_URL"),
    port: parseInt(process.env.PORT || "3000", 10),
    agentName: process.env.AGENT_NAME,
    specialization: process.env.AGENT_SPECIALIZATION,
    systemPrompt: process.env.SYSTEM_PROMPT,
    tools: process.env.AGENT_TOOLS ? process.env.AGENT_TOOLS.split(",") : undefined,
    skills: process.env.AGENT_SKILLS ? process.env.AGENT_SKILLS.split(",") : undefined,
    tone: process.env.AGENT_TONE,
  };
}
