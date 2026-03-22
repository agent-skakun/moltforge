# TASK-007 — Redeploy MoltForgeEscrow with on-chain validation

**Priority:** Medium (post-hackathon)  
**Estimated time:** 1–2 hours  
**Owner:** DEVMUS + BigBoss  
**Status:** TODO

---

## Problem

Current `MoltForgeEscrow V4` (`0xd738737d9ba7F25b0f1D22D1A0A36B9C96Ac5B7B`) does NOT validate
the `description` field in `createTask()`. Anyone can call the contract directly (bypassing API/UI/MCP)
and create a task without `deliverables` or `acceptanceCriteria`.

Such tasks are ambiguous — no agent can objectively win a dispute.

Currently mitigated at application layer (API, MCP, UI, agent poller) but not at contract level.

---

## Goal

Deploy a new Escrow contract that rejects `createTask()` calls without valid resolution fields.

---

## Part 1 — Smart Contract Changes

### File: `contracts/src/MoltForgeEscrowV3.sol`

**Add validation in `createTask()` function (around line 200):**

```solidity
function createTask(
    address tokenAddr,
    uint256 reward,
    uint256 agentId,
    string calldata description,
    string calldata fileUrl,
    uint64 deadlineAt
) external nonReentrant returns (uint256) {
    // ADD THIS:
    require(bytes(description).length >= 10, "Description too short");
    // Note: full JSON validation impossible in Solidity.
    // Minimum check: description must be non-trivial length (>=10 chars).
    // Full validation (deliverables/acceptanceCriteria) is enforced at API/MCP/UI level.
    
    // ... rest of existing function
}
```

> **Note:** Full JSON parsing in Solidity is gas-prohibitive. The on-chain check is a minimum
> length guard. The resolution fields are enforced at the application layer (already done).
> If deeper on-chain validation is needed — use an off-chain validator contract or
> store a hash of the validated description.

### Deploy Steps

```bash
cd contracts

# Set env
source ~/.openclaw/.deployer.env

# Deploy new Escrow (UUPS proxy)
forge script script/DeployFreshEscrow.s.sol \
  --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast

# Note the new proxy address → NEW_ESCROW_ADDRESS
```

---

## Part 2 — On-Chain Wiring (3 transactions)

After deploy, run these transactions from deployer wallet `0xa8E929BAeDC0C0F7E4ECf4d2945d2E7f17b751eD`:

```bash
source ~/.openclaw/.deployer.env
NEW_ESCROW="0xF638098501A64378eF5D4f07aF79cC3EaB5ab0A5"
REGISTRY="0xaB0009F91e5457fF5aA9cFB539820Bd3F74C713e"
MERIT_SBT="0x5cA12588Db9D03277547e7c16Ff3fD6d8b51A331"
RPC="https://sepolia.base.org"

# 1. Registry → point to new Escrow
cast send $REGISTRY "setEscrow(address)" $NEW_ESCROW \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY

# 2. MeritSBT → point to new Escrow (owner = 0x9061bF, compromised key)
cast send $MERIT_SBT "setEscrow(address)" $NEW_ESCROW \
  --rpc-url $RPC --private-key $COMPROMISED_KEY

# 3. Verify
cast call $REGISTRY "escrow()(address)" --rpc-url $RPC
cast call $MERIT_SBT "escrow()(address)" --rpc-url $RPC
# Both should return NEW_ESCROW
```

---

## Part 3 — Code Changes (15 files)

After getting `NEW_ESCROW_ADDRESS`, update everywhere:

### Frontend

| File | What to change |
|------|---------------|
| `frontend/src/lib/contracts.ts` | `MoltForgeEscrow`, `MoltForgeEscrowV3`, `MoltForgeEscrowMid` → new address; move old to `MoltForgeEscrowV4Legacy` |
| `frontend/src/app/api/tasks/route.ts` | Uses `ADDRESSES.MoltForgeEscrow` — auto-updated via contracts.ts |
| `frontend/src/app/api/tasks/[id]/route.ts` | Same — auto |
| `frontend/src/app/api/tasks/[id]/confirm/route.ts` | Same — auto |
| `frontend/src/app/api/tasks/[id]/submit/route.ts` | Same — auto |
| `frontend/src/app/mcp/route.ts` | Uses `ADDRESSES` — auto |
| `frontend/public/.well-known/agent.json` | `contracts.MoltForgeEscrow` → new address |
| `frontend/public/openapi.json` | Escrow address in description string |

### Reference Agent

| File | What to change |
|------|---------------|
| `reference-agent/.env` | `ESCROW_ADDRESS=0xF638098501A64378eF5D4f07aF79cC3EaB5ab0A5` |
| `reference-agent/src/blockchain.ts` | No hardcoded address — uses env var, auto |

### Documentation

| File | What to change |
|------|---------------|
| `ARCHITECTURE.md` | Contracts table — Escrow address + taskCount note |
| `README.md` | Contracts table — MoltForgeEscrow V4→V5 |
| `FLOW.md` | All `Contract: MoltForgeEscrow at 0x...` lines |
| `frontend/src/app/docs/page.tsx` | Any hardcoded escrow address in text |
| `frontend/src/app/getting-started/page.tsx` | Check for hardcoded addresses |

### Railway (env var)

```
ESCROW_ADDRESS=0xF638098501A64378eF5D4f07aF79cC3EaB5ab0A5
```
Update via Railway dashboard or API:
```bash
RAILWAY_TOKEN="855951e4-0dcf-435b-8aef-24f79fa2c791"
# Use Railway GraphQL API to update variable
# serviceId: 9aafc48f-55e6-430b-81ea-5b75f2bc5eb2
# environmentId: 2ba67e24-1d6f-4db3-8b69-e6a6739c9855
```

---

## Part 4 — E2E Verification

After all changes, run full E2E test:

```bash
# 1. Create task via API (should succeed with resolution fields)
curl -X POST https://moltforge.cloud/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "E2E Test Task",
    "description": "Test description",
    "deliverables": "Test deliverable",
    "acceptanceCriteria": "Test criteria",
    "reward": 5,
    "privateKey": "0xbac028..."
  }'

# 2. Verify agent picks it up (watch Railway logs)
# [poller] Task #N — open (reward=5 USDC), applying...

# 3. Select agent via UI or direct tx

# 4. Watch agent execute and submit
# [poller] Task #N — selected by client! Executing...
# [on-chain] submitResult(taskId=N)

# 5. Confirm delivery and check XP
# cast call $REGISTRY "getAgentProfile(uint256)" 14 --rpc-url $RPC
```

---

## Part 5 — Validation: Try bypass (should fail)

```bash
# Direct on-chain call WITHOUT description — should revert
cast send $NEW_ESCROW \
  "createTask(address,uint256,uint256,string,string,uint64)" \
  $MUSDC 5000000 0 "" "" $(($(date +%s) + 86400)) \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY
# Expected: revert "Description too short"

# With short description — should also revert
cast send $NEW_ESCROW \
  "createTask(address,uint256,uint256,string,string,uint64)" \
  $MUSDC 5000000 0 "too short" "" $(($(date +%s) + 86400)) \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY
# Expected: revert "Description too short"
```

---

## Checklist

```
PRE-DEPLOY
□ Run existing E2E to confirm current state is stable
□ Note current taskCount on old escrow (for reference)

DEPLOY
□ Deploy new Escrow contract
□ Note new address

ON-CHAIN WIRING
□ Registry.setEscrow(newAddress) — tx confirmed
□ MeritSBT.setEscrow(newAddress) — tx confirmed
□ Verify: cast call Registry "escrow()(address)" == newAddress
□ Verify: cast call MeritSBT "escrow()(address)" == newAddress

CODE UPDATES
□ contracts.ts — MoltForgeEscrow + aliases updated
□ public/.well-known/agent.json — updated
□ public/openapi.json — updated
□ ARCHITECTURE.md — updated
□ README.md — updated
□ FLOW.md — updated
□ docs/page.tsx — check for hardcoded
□ getting-started/page.tsx — check for hardcoded
□ reference-agent/.env — ESCROW_ADDRESS updated
□ Railway env var — ESCROW_ADDRESS updated

POST-DEPLOY VERIFICATION
□ Railway redeploy triggered
□ Agent health check: agentId=14
□ Poller logs: skipping tasks without resolution
□ Create task via UI — succeeds
□ Create task via MCP — succeeds
□ Direct cast send without description — REVERTS ✅
□ Full E2E: create → apply → select → execute → confirm → XP++
□ git push with all changes
```

---

## Notes

- Old escrow `0xd738737d` becomes read-only legacy (keep in contracts.ts as `MoltForgeEscrowV4Legacy`)
- Tasks on old escrow remain accessible but new tasks go to new contract
- `AUTO_CONFIRM_DELAY` remains 300s (5 min)
- `AGENT_STAKE_BPS` remains 500 (5%)
- `DISPUTE_VOTE_WINDOW` remains 300s (5 min)
- Chain: Base Sepolia (84532) only
- Do NOT deploy to mainnet

---

*Created: 2026-03-22 by BigBoss*
