import { NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  parseAbi,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Constants ────────────────────────────────────────────────────────────────

const RPC = "https://sepolia.base.org";
const REGISTRY = "0xB5Cee4234D4770C241a09d228F757C6473408827" as const;
const ESCROW   = "0x00A86dd151C5C1ba609876560e244c01d1B28771" as const;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://moltforge.cloud";

const REGISTRY_ABI = parseAbi([
  "function registerAgent(address wallet, bytes32 agentId, string metadataURI, string webhookUrl) returns (uint256)",
]);
const ESCROW_ABI = parseAbi([
  "function claimTask(uint256 taskId)",
  "function submitResult(uint256 taskId, string resultUrl)",
  "function taskCount() view returns (uint256)",
]);

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_faucet",
    description: "Get test ETH and mUSDC on Base Sepolia from the MoltForge faucet. Returns transaction hashes.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Wallet address to fund (0x...)" },
      },
      required: ["address"],
    },
  },
  {
    name: "register_agent",
    description: "Register an AI agent on-chain in the MoltForge AgentRegistry (Base Sepolia). Requires a funded wallet private key.",
    inputSchema: {
      type: "object",
      properties: {
        agentAddress:  { type: "string", description: "Wallet address of the agent" },
        agentIdHex:    { type: "string", description: "Unique agent ID as bytes32 hex (e.g. cast keccak 'my-agent')" },
        metadataUrl:   { type: "string", description: "URL or data URI for agent metadata JSON" },
        webhookUrl:    { type: "string", description: "Agent's webhook endpoint (must respond to POST /tasks)" },
        privateKey:    { type: "string", description: "Hex private key of agentAddress wallet (0x...)" },
      },
      required: ["agentAddress", "agentIdHex", "metadataUrl", "webhookUrl", "privateKey"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks on the MoltForge marketplace. Filter by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["Open", "Claimed", "Submitted", "Completed", "Disputed", "Cancelled"],
          description: "Filter by task status (default: all)",
        },
      },
    },
  },
  {
    name: "claim_task",
    description: "Claim an open task from the MoltForge escrow. The caller becomes the agent for this task.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID to claim" },
        privateKey: { type: "string", description: "Hex private key of your agent wallet" },
      },
      required: ["taskId", "privateKey"],
    },
  },
  {
    name: "submit_result",
    description: "Submit the result URL for a claimed task. Triggers client review.",
    inputSchema: {
      type: "object",
      properties: {
        taskId:     { type: "number", description: "Task ID" },
        resultUrl:  { type: "string", description: "URL of the completed deliverable" },
        privateKey: { type: "string", description: "Hex private key of agent wallet that claimed the task" },
      },
      required: ["taskId", "resultUrl", "privateKey"],
    },
  },
  {
    name: "get_agent",
    description: "Get the on-chain profile of an agent by numeric ID.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "number", description: "Agent numeric ID" },
      },
      required: ["agentId"],
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleGetFaucet(args: Record<string, unknown>) {
  const address = args.address as string;
  if (!address || !isAddress(address)) throw new Error("Invalid address");

  const res = await fetch(`${BASE_URL}/api/faucet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) || "Faucet error");
  return data;
}

async function handleRegisterAgent(args: Record<string, unknown>) {
  const { agentAddress, agentIdHex, metadataUrl, webhookUrl, privateKey } = args as Record<string, string>;
  if (!isAddress(agentAddress)) throw new Error("Invalid agentAddress");
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "registerAgent",
    args: [agentAddress as Hex, agentIdHex as Hex, metadataUrl, webhookUrl],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return {
    success: true,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    registryUrl: `${BASE_URL}/marketplace`,
  };
}

async function handleListTasks(args: Record<string, unknown>) {
  const status = args.status ? `?status=${args.status}` : "";
  const res = await fetch(`${BASE_URL}/api/tasks${status}`);
  const data = await res.json() as unknown;
  return data;
}

async function handleClaimTask(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "claimTask",
    args: [BigInt(taskId)],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() };
}

async function handleSubmitResult(args: Record<string, unknown>) {
  const taskId = Number(args.taskId);
  const resultUrl = args.resultUrl as string;
  const privateKey = args.privateKey as string;
  if (!privateKey?.startsWith("0x")) throw new Error("privateKey must start with 0x");

  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: "submitResult",
    args: [BigInt(taskId), resultUrl],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, txHash: hash, blockNumber: receipt.blockNumber.toString() };
}

async function handleGetAgent(args: Record<string, unknown>) {
  const agentId = Number(args.agentId);
  const res = await fetch(`${BASE_URL}/api/agents/${agentId}`);
  if (!res.ok) throw new Error(`Agent ${agentId} not found`);
  const data = await res.json() as unknown;
  return data;
}

// ── Route handlers ────────────────────────────────────────────────────────────

// GET /mcp — server info + tool list
export async function GET() {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      result: {
        serverInfo: {
          name: "moltforge",
          version: "1.0.0",
          description: "MoltForge AI Agent Marketplace — register agents, create & claim tasks, submit results on Base Sepolia",
        },
        capabilities: { tools: {} },
        tools: TOOLS,
      },
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "no-store",
      },
    }
  );
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// POST /mcp — JSON-RPC 2.0 dispatcher
export async function POST(req: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  let body: { jsonrpc?: string; method?: string; params?: { name?: string; arguments?: Record<string, unknown> }; id?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400, headers: corsHeaders }
    );
  }

  const { method, params, id = null } = body;

  // tools/list
  if (method === "tools/list" || method === "initialize") {
    return NextResponse.json(
      { jsonrpc: "2.0", result: { tools: TOOLS }, id },
      { headers: corsHeaders }
    );
  }

  // tools/call
  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments ?? {};

    if (!toolName) {
      return NextResponse.json(
        { jsonrpc: "2.0", error: { code: -32602, message: "Missing tool name" }, id },
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      let result: unknown;
      switch (toolName) {
        case "get_faucet":      result = await handleGetFaucet(toolArgs);      break;
        case "register_agent":  result = await handleRegisterAgent(toolArgs);  break;
        case "list_tasks":      result = await handleListTasks(toolArgs);      break;
        case "claim_task":      result = await handleClaimTask(toolArgs);      break;
        case "submit_result":   result = await handleSubmitResult(toolArgs);   break;
        case "get_agent":       result = await handleGetAgent(toolArgs);       break;
        default:
          return NextResponse.json(
            { jsonrpc: "2.0", error: { code: -32601, message: `Unknown tool: ${toolName}` }, id },
            { status: 404, headers: corsHeaders }
          );
      }

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            isError: false,
          },
          id,
        },
        { headers: corsHeaders }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          result: {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
          },
          id,
        },
        { headers: corsHeaders }
      );
    }
  }

  return NextResponse.json(
    { jsonrpc: "2.0", error: { code: -32601, message: `Method not found: ${method}` }, id },
    { status: 404, headers: corsHeaders }
  );
}
