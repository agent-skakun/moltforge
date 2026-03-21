/**
 * MoltForge Agent Poller
 *
 * Loop 1 (every 30s): Scan Open tasks → self-assess → apply or claim
 * Loop 2 (every 15s): Watch applied tasks → detect selection → execute & submit
 */
import { type Config } from "./config";
import { canHandleTask, type TaskInfo } from "./blockchain";

const SCAN_INTERVAL_MS  = 30_000;
const WATCH_INTERVAL_MS = 15_000;

export interface PollerDeps {
  config: Config;
  getAgentId: () => Promise<bigint>;
  getTask: (id: bigint) => Promise<TaskInfo>;
  getOpenTasks: (offset?: bigint, limit?: bigint) => Promise<Array<{ id: bigint; agentId: bigint; reward: bigint; deadlineAt: bigint }>>;
  claimTask: (id: bigint) => Promise<`0x${string}`>;
  applyForTask: (id: bigint) => Promise<`0x${string}`>;
  submitResult: (id: bigint, url: string) => Promise<`0x${string}`>;
  executeTask: (task: TaskInfo) => Promise<{ resultUrl: string }>;
}

const appliedTasks  = new Set<bigint>();  // applied, waiting to be selected
const claimedTasks  = new Set<bigint>();  // claimed / currently executing

export function startPoller(deps: PollerDeps): void {
  console.log("[poller] Starting open-task scanner + application monitor");

  // ── Loop 1: Scan for new Open tasks ──────────────────────────────────────────
  async function scanOpenTasks() {
    try {
      const myId = await deps.getAgentId();
      if (myId === 0n) { console.warn("[poller] Not registered, skip scan"); return; }

      const openTasks = await deps.getOpenTasks(0n, 20n);
      if (openTasks.length > 0) console.log(`[poller] ${openTasks.length} open tasks found`);

      for (const t of openTasks) {
        if (appliedTasks.has(t.id) || claimedTasks.has(t.id)) continue;

        try {
          const task = await deps.getTask(t.id);
          const { canHandle, reason } = canHandleTask(task, myId);

          if (!canHandle) {
            console.log(`[poller] Task #${t.id} — skip (${reason})`);
            continue;
          }

          // Direct-hire for us → claim immediately and execute
          if (task.agentId === myId) {
            console.log(`[poller] Task #${t.id} — direct hire, claiming...`);
            claimedTasks.add(t.id);
            await deps.claimTask(t.id);
            await executeAndSubmit(t.id, task);
          }
          // Open task → apply and wait for client to select us
          else if (task.agentId === 0n) {
            console.log(`[poller] Task #${t.id} — open (reward=${Number(task.reward)/1e6} USDC), applying...`);
            appliedTasks.add(t.id);
            await deps.applyForTask(t.id);
          }
        } catch (e) {
          console.warn(`[poller] Task #${t.id} error: ${(e as Error).message?.slice(0, 100)}`);
          // Remove from sets so we retry next scan
          appliedTasks.delete(t.id);
        }
      }
    } catch (e) {
      console.warn("[poller] scanOpenTasks error:", (e as Error).message?.slice(0, 80));
    }
  }

  // ── Loop 2: Watch applied tasks — detect when client selects us ───────────────
  async function watchApplications() {
    if (appliedTasks.size === 0) return;
    try {
      const myWallet = deps.config.walletAddress.toLowerCase();

      for (const taskId of [...appliedTasks]) {
        try {
          const task = await deps.getTask(taskId);

          // Status=1 (Claimed) AND claimedBy = our wallet → we were selected!
          if (task.status === 1 && task.claimedBy.toLowerCase() === myWallet) {
            console.log(`[poller] Task #${taskId} — selected by client! Executing...`);
            appliedTasks.delete(taskId);
            claimedTasks.add(taskId);
            await executeAndSubmit(taskId, task);
          }
          // Task moved past Open/Claimed without us → stop watching
          else if (task.status > 1) {
            console.log(`[poller] Task #${taskId} — status ${task.status}, removing`);
            appliedTasks.delete(taskId);
          }
        } catch (e) {
          console.warn(`[poller] watch #${taskId} error: ${(e as Error).message?.slice(0, 80)}`);
        }
      }
    } catch (e) {
      console.warn("[poller] watchApplications error:", (e as Error).message?.slice(0, 80));
    }
  }

  // ── Helper: execute task and submit result ────────────────────────────────────
  async function executeAndSubmit(taskId: bigint, task: TaskInfo) {
    try {
      const { resultUrl } = await deps.executeTask(task);
      const txHash = await deps.submitResult(taskId, resultUrl);
      claimedTasks.delete(taskId);
      console.log(`[poller] Task #${taskId} done → ${txHash}`);
    } catch (e) {
      console.error(`[poller] executeAndSubmit #${taskId} failed: ${(e as Error).message?.slice(0, 120)}`);
      claimedTasks.delete(taskId);
    }
  }

  // Start loops with initial delay
  setTimeout(scanOpenTasks,    3_000);
  setTimeout(watchApplications, 7_000);
  setInterval(scanOpenTasks,    SCAN_INTERVAL_MS);
  setInterval(watchApplications, WATCH_INTERVAL_MS);

  console.log(`[poller] Scan every ${SCAN_INTERVAL_MS/1000}s | Watch every ${WATCH_INTERVAL_MS/1000}s`);
}
