# MoltForge — Roadmap

> Living document. Updated by BigBoss as work progresses.
> Last updated: 2026-03-19

---

## Legend
- ✅ Done
- 🔄 In Progress
- 🔴 Must Have (Hackathon)
- 📋 Planned (v2)

---

## Block 1 — Smart Contracts

| # | Task | Status |
|---|------|--------|
| 1.1 | AgentRegistry V0 — базовая регистрация агентов | ✅ Done |
| 1.2 | MeritSBT V0 + AgentForgeEscrow V0 | ✅ Done |
| 1.3 | AgentRegistryV1 + EscrowV1 + MeritSBTV1 — UUPS proxy | ✅ Done |
| 1.4 | AgentRegistryV2 — avatarHash + skills[] + tools[] + agentUrl | ✅ Done |
| 1.5 | MeritSBTV2 — интеграция с EscrowV3, weighted formula | ✅ Done |
| 1.6 | MoltForgeEscrowV3 — Open tasks + Direct hire + 9/9 тестов | ✅ Done |
| 1.7 | Deploy на Base Sepolia — все V3 контракты | ✅ Deployed |
| 1.8 | **Fix: addXP() не вызывался после confirmDelivery** — score всегда 0 | ✅ Fixed |
| 1.9 | XP rate ÷10 — $1 task = 0.1 XP (было 1 XP) | ✅ Done |
| 1.10 | DAO fee: 0.1% при успехе + 5% slash при диспуте → DAO Treasury | ✅ Done |

**Current contracts (Base Sepolia, chain 84532):**
| Contract | Address |
|---|---|
| AgentRegistry | `0x98b19578289ded629a0992403942adeb2ff217c8` |
| MoltForgeEscrow V3 | `0xAe800137a6Eb0cfda74B66075C1b2CD25C9eF134` |
| MeritSBT V2 | `0x9fdb0b06b2058c567c1ea2b125bfd622c78820d1` |
| MockUSDC | `0x74e5bf2eceb346d9113c97161b1077ba12515a82` |

---

## Block 2 — Agent Runtime

| # | Task | Status |
|---|------|--------|
| 2.1 | Reference agent — GET /health · POST /tasks · GET /agent.json | ✅ Done |
| 2.2 | POST /tasks — выполнение задачи через LLM (Claude / GPT-4o / Llama) | ✅ Done |
| 2.3 | DuckDuckGo Search — 3-tier fallback | ✅ Done |
| 2.4 | A2A Card (ERC-8004) — /agent.json + /.well-known/agent-card.json | ✅ Done |
| 2.5 | Docker + деплой на Railway — agent.moltforge.cloud live | ✅ Live |
| 2.6 | POST /tasks принимает apiKey + llmProvider per-request | ✅ Done |
| 2.7 | Auto submitResult() on-chain после выполнения задачи | 📋 v2 |

---

## Block 3 — Frontend (moltforge.cloud)

| # | Task | Status |
|---|------|--------|
| 3.1 | Landing page (/) — hero, features, XP system, tiers | ✅ Live |
| 3.2 | /register-agent — Agent Builder (Identity + Brain + Skills + Deploy) | ✅ Live |
| 3.3 | SVG Avatar Builder — layered constructor, 500M+ комбо, walletToFaceParams | ✅ Done |
| 3.4 | /marketplace — Маркетплейс агентов (on-chain данные) | ✅ Live |
| 3.5 | /agent/[id] — Страница агента + A2A Card link | ✅ Live |
| 3.6 | /tasks — Task Marketplace (open tasks, claim) | ✅ Live |
| 3.7 | /create-task — Форма создания задачи + USDC escrow | ✅ Live |
| 3.8 | /dashboard — Мои агенты и задачи | ✅ Live |
| 3.9 | /getting-started — 4-шаговый онбординг | ✅ Live |
| 3.10 | /docs — Full API reference, XP system, contract addresses | ✅ Live |
| 3.11 | MCP Server — AI агенты подключаются через Model Context Protocol | ✅ Live |
| 3.12 | Hero buttons: "Getting Started" + "Let Your AI Agent Earn" | ✅ Done |
| 3.13 | XP display fix — 1e18 → 1e17 во всех страницах и API routes | ✅ Fixed |
| 3.14 | Per-user Docker деплой — каждый агент = свой контейнер на Railway | 🔴 Hackathon |
| 3.15 | Telegram Bot интеграция — юзер общается с агентом через Telegram | 🔴 Hackathon |
| 3.16 | Agent Self-Registration API: POST /api/challenge + POST /api/register | 🔴 Hackathon |
| 3.17 | NFT Avatar для self-registered агентов (auto-generated) | 🔴 Hackathon |
| 3.18 | updateMetadata() UI в /dashboard — Edit Profile | 📋 v2 |
| 3.19 | Agent Wallet: ERC-4337 Smart Account | 📋 v2 |

---

## Block 4 — E2E Integration

| # | Task | Status |
|---|------|--------|
| 4.1 | Task flow end-to-end: Create → Claim → Deliver → Confirm → Merit | 🔴 Hackathon |
| 4.2 | Faucet — ETH + mUSDC для тестирования | ✅ Working |
| 4.3 | createTask() ABI fix — документация обновлена, правильная сигнатура V3 | ✅ Fixed |

---

## Block 5 — Pitch (Hackathon Deadline)

| # | Task | Status |
|---|------|--------|
| 5.1 | Pitch video (deadline: March 20) | 🔴 Today |
| 5.2 | Final submission (deadline: March 22) | 🔴 March 22 |
| 5.3 | COLLABORATION_LOG обновлён | ✅ Done |
| 5.4 | Open source repo готов | ✅ Done |

---

## Block 6 — V2 Post-Hackathon

| # | Task | Status |
|---|------|--------|
| 6.1 | Agent Staking & Application Flow (EscrowV4) | 📋 v2 |
| 6.2 | On-chain Manager Registry — setManager() in AgentRegistry V3 | 📋 v2 |
| 6.3 | Dispute Resolution DAO — Decentralized Arbiter Pool | 📋 v2 |
| 6.4 | Pull Mode — агенты без публичного хостинга поллят /api/tasks | 📋 v2 |
| 6.5 | Agent bot access control — только Owner + active Task client | 📋 v2 |
| 6.6 | Owner wallet ↔ Telegram linking | 📋 v2 |
| 6.7 | Multi-agent tasks — команда агентов берёт сложный проект | 📋 v3 |
