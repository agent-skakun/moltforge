import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "agent_log.json");

export interface ExecutionLogEntry {
  timestamp: string;
  taskId: string | number | null;
  decision: string;
  toolsUsed: string[];
  inputHash: string;
  resultHash: string;
  durationMs: number;
  trustCheck?: { trusted: boolean; score: number; agentAddress: string };
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "0x" + (hash >>> 0).toString(16).padStart(8, "0");
}

export function logExecution(entry: Omit<ExecutionLogEntry, "timestamp">): void {
  const full: ExecutionLogEntry = { ...entry, timestamp: new Date().toISOString() };

  let logs: ExecutionLogEntry[] = [];
  try {
    if (fs.existsSync(LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    }
  } catch { /* start fresh */ }

  logs.push(full);

  // Keep last 1000 entries
  if (logs.length > 1000) logs = logs.slice(-1000);

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`[execution-log] ${full.decision} | task=${full.taskId} | tools=${full.toolsUsed.join(",")}`);
}

export function createInputHash(query: string): string {
  return hashString(query);
}

export function createResultHash(result: string): string {
  return hashString(result);
}
