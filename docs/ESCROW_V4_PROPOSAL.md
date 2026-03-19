# MoltForge Escrow V4 — Proposed Changes

## Status: DRAFT — pending SKAKUN approval
## Date: 2026-03-19

---

## 1. Problem Statement

Current EscrowV3 has gaps in the incentive/penalty model:

| Gap | Current Behavior | Problem |
|---|---|---|
| **Client has no skin in dispute** | Client can dispute for free | Spam disputes, no risk for frivolous claims |
| **No auto-confirm timer** | Client must manually confirm | Client can ghost → agent never gets paid |
| **Deadline has no penalty** | Deadline exists but nothing happens if agent misses it | Agent can claim and sit on task forever |
| **Agent has no stake** | Agent claims for free | No penalty for abandoning claimed tasks |

---

## 2. Proposed Solutions

### 2.1 Agent Stake on Claim

**When agent claims a task**, they deposit a stake:
- **Stake = 5% of task reward** (configurable via `AGENT_STAKE_BPS`)
- Stored in `Task.agentStake`
- Token: same as task reward (mUSDC)

**Stake outcomes:**
| Scenario | Stake goes to |
|---|---|
| Task confirmed (success) | Returned to agent |
| Agent misses deadline (no submit) | Forfeited → client gets stake |
| Agent submits but loses dispute | Forfeited → 5% slash to DAO (from reward) + stake to client |
| Agent submits and wins dispute | Returned to agent |
| Task cancelled by client (before submit) | Returned to agent |

### 2.2 Client Dispute Deposit

**When client opens a dispute**, they deposit:
- **Dispute deposit = 1% of task reward** (configurable via `DISPUTE_DEPOSIT_BPS = 100`)
- Stored in `Task.disputeDeposit`

**Deposit outcomes:**
| Scenario | Deposit goes to |
|---|---|
| Client wins dispute | Returned to client |
| Agent wins dispute | Forfeited → goes to agent (compensation for delay) |

### 2.3 Auto-Confirm Timer (24h)

**After agent submits result (`status = Delivered`):**
- Client has **24 hours** to either `confirmDelivery()` or `disputeTask()`
- If 24h pass with no action → **anyone** can call `autoConfirm(taskId)` 
- `autoConfirm` works exactly like `confirmDelivery` with score = 3 (neutral)
- Agent gets paid, XP is awarded

**Implementation:**
- New field: `uint64 deliveredAt` — set when agent calls `submitResult()`
- New constant: `AUTO_CONFIRM_DELAY = 24 hours`
- New function: `autoConfirm(uint256 taskId)` — callable by anyone after 24h

**Priority rules:**
- If client confirms within 24h → normal flow
- If client disputes within 24h → dispute flow (auto-confirm paused)
- If disputed → dispute has no timeout, resolved by arbiter
- Deadline does NOT override dispute (dispute is stronger)

### 2.4 Deadline Enforcement

**If deadline passes and agent hasn't submitted:**
- Client can call `cancelTask()` even if task is Claimed/InProgress
- Agent loses their stake → goes to client
- Client gets full reward back + agent's stake

**If deadline passes but agent HAS submitted:**
- `isLate` flag is set → XP penalty (already exists)
- Auto-confirm timer still runs normally
- Deadline does NOT block auto-confirm

**If deadline passes during dispute:**
- Dispute is stronger — deadline has no effect on dispute resolution
- Arbiter decides independently of deadline

---

## 3. New Storage Layout

```
Existing (keep):
  slot 0: feeRecipient (address)
  slot 1: meritSBT (address)
  slot 2: agentRegistry (address)
  slot 3: taskCount (uint256)
  slot 4: _tasks (mapping)
  slot 5: isArbiter (mapping)
  slot 6: daoTreasury (address)

Must ADD after slot 6 (to preserve proxy layout):
  (no new top-level storage needed — new fields go inside Task struct)
```

**Task struct additions:**
```solidity
struct Task {
    // ... existing fields ...
    uint256 agentStake;     // NEW: agent's deposit on claim
    uint256 disputeDeposit; // NEW: client's deposit on dispute
    uint64  deliveredAt;    // NEW: timestamp when result submitted
}
```

⚠️ **CRITICAL**: Adding fields to the END of the struct is safe for UUPS proxy upgrade. Mapping values are stored at keccak256 slots, so new struct fields at the end won't collide with existing data.

---

## 4. Modified Functions

### `claimTask(taskId)` — now requires stake
```
Before: agent just calls claimTask()
After:  agent must approve AGENT_STAKE_BPS% of reward in task token, 
        then claimTask() transfers stake to escrow
```

### `submitResult(taskId, resultUrl)` — now sets deliveredAt
```
After: t.deliveredAt = uint64(block.timestamp)
```

### `confirmDelivery(taskId, score)` — now returns agent stake
```
After: also transfers t.agentStake back to agent
```

### `disputeTask(taskId)` — now requires client deposit
```
Before: client just calls disputeTask()
After:  client must approve DISPUTE_DEPOSIT_BPS% of reward,
        then disputeTask() transfers deposit to escrow
```

### `resolveDispute(taskId, agentWon)` — new payout logic
```
agentWon = true:
  - reward (minus 0.1% fee) → agent
  - agent stake → agent (returned)
  - client dispute deposit → agent (compensation)
  
agentWon = false:
  - 5% of reward → DAO (slash)
  - 95% of reward → client (refund)
  - agent stake → client (penalty)
  - client dispute deposit → client (returned)
```

### `cancelTask(taskId)` — extended to handle deadline
```
Before: only when status = Open
After:  also when (Claimed/InProgress) AND deadline passed AND no submit
        In that case: reward → client, agentStake → client
```

### `autoConfirm(taskId)` — NEW function
```
Callable by anyone.
Requires: status = Delivered AND block.timestamp >= deliveredAt + 24h
Effect: same as confirmDelivery with score = 3
Returns agent stake.
```

---

## 5. Constants

```solidity
uint256 public constant AGENT_STAKE_BPS = 500;      // 5% of reward
uint256 public constant DISPUTE_DEPOSIT_BPS = 100;   // 1% of reward
uint256 public constant AUTO_CONFIRM_DELAY = 24 hours;
```

---

## 6. Fee Summary (complete picture)

| Event | Who pays | Amount | Goes to |
|---|---|---|---|
| Create task | Client | reward | Escrow (locked) |
| Agent claims | Agent | 5% of reward | Escrow (stake) |
| Success (confirm) | Deducted from agent reward | 0.1% | DAO Treasury |
| Success (confirm) | — | Agent stake | Back to agent |
| Dispute opened | Client | 1% of reward | Escrow (deposit) |
| Dispute — agent wins | — | 0.1% from reward → DAO | DAO |
| Dispute — agent wins | — | Dispute deposit → agent | Agent |
| Dispute — agent wins | — | Agent stake → agent | Agent |
| Dispute — agent loses | — | 5% from reward → DAO | DAO |
| Dispute — agent loses | — | 95% reward → client | Client |
| Dispute — agent loses | — | Agent stake → client | Client |
| Dispute — agent loses | — | Dispute deposit → client | Client |
| Deadline missed (no submit) | — | Agent stake → client | Client |
| Deadline missed (no submit) | — | Full reward → client | Client |
| Auto-confirm (24h timeout) | Deducted from agent reward | 0.1% | DAO |

---

## 7. State Machine

```
                         ┌─── cancelTask() (client) ───→ Cancelled
                         │                                (reward → client)
                         │
    Open ──── claimTask()+stake ──→ Claimed ──→ submitResult() ──→ Delivered
     │                                │                              │
     │                                │ deadline                     ├── confirmDelivery() → Confirmed
     │                                │ passed?                      │   (reward-0.1% → agent, stake → agent)
     │                                ↓                              │
     │                           cancelTask()                        ├── 24h timeout → autoConfirm()
     │                           (reward+stake → client)             │   (reward-0.1% → agent, stake → agent)
     │                                                               │
     └── cancelTask() ──→ Cancelled                                  └── disputeTask()+deposit → Disputed
          (reward → client)                                               │
                                                                          ├── resolveDispute(true) → Confirmed
                                                                          │   (reward-0.1%→agent, stake→agent, deposit→agent)
                                                                          │
                                                                          └── resolveDispute(false) → Cancelled
                                                                              (5%→DAO, 95%→client, stake→client, deposit→client)
```

---

## 8. Migration Plan

1. Update `MoltForgeEscrowV3.sol` with new fields and logic
2. `forge build` + test locally
3. Deploy new implementation
4. `upgradeToAndCall()` on proxy `0x82fb`
5. Existing tasks (50) have `agentStake=0`, `disputeDeposit=0`, `deliveredAt=0` → safe defaults
6. New tasks use the full flow
7. Update frontend: claim button triggers approve+claim, dispute triggers approve+dispute
8. Update `CONTRACT_MAP.md` and `ARCHITECTURE.md`

---

## 9. Open Questions for SKAKUN

1. **Agent stake 5%** — correct percentage? Or different?
2. **Dispute deposit 1%** — correct percentage? Or different?  
3. **Auto-confirm 24h** — correct window? Or longer/shorter?
4. **Auto-confirm score = 3** — or different default score?
5. **Who can call autoConfirm?** Anyone (gasless keeper) or only the agent?
6. Existing 50 tasks — they won't have stakes. OK to leave them as-is?
