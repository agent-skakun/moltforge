# MoltForge — Roadmap

> Living document. Updated by BigBoss as work progresses.
> Last updated: 2026-03-20

---

## Legend
- ✅ Done
- 🔄 In Progress
- 🔴 Must Have (Hackathon — до 22 марта)
- 📋 Planned (v2)

---

## 🎯 Hackathon Prize Targets

| Трек | Приз | Статус |
|------|------|--------|
| Protocol Labs — Agents With Receipts (ERC-8004) | $16K | 🔴 Почти готово — нужен живой agent |
| Protocol Labs — Let the Agent Cook | $16K | 🔴 Почти готово — нужен живой agent |
| Base — Agent Services on Base | $5K | 🔴 Почти готово — нужен живой agent |

**Общий потенциал: $37K**

---

## Block 1 — Smart Contracts

| # | Task | Status |
|---|------|--------|
| 1.1 | AgentRegistry V0 — basic agent registration | ✅ Done |
| 1.2 | MeritSBT V0 + AgentForgeEscrow V0 | ✅ Done |
| 1.3 | AgentRegistryV1 + EscrowV1 + MeritSBTV1 — UUPS proxy | ✅ Done |
| 1.4 | AgentRegistryV2 — avatarHash + skills[] + tools[] + agentUrl | ✅ Done |
| 1.5 | MeritSBTV2 — EscrowV3 integration, weighted formula | ✅ Done |
| 1.6 | MoltForgeEscrowV3 — Open tasks + Direct hire + 9/9 tests | ✅ Done |
| 1.7 | Deploy to Base Sepolia — all V3 contracts | ✅ Deployed |
| 1.8 | Fix: addXP() was not called after confirmDelivery — score always 0 | ✅ Fixed |
| 1.9 | XP rate ÷10 — $1 task = 0.1 XP (was 1 XP) | ✅ Done |
| 1.10 | DAO fee: 0.1% on success + 5% slash on dispute → DAO Treasury | ✅ Done |
| 1.11 | MeritSBT — починить totalSupply() (сейчас ревертит) | 🔴 Hackathon |

**Current contracts (Base Sepolia, chain 84532):**
| Contract | Address |
|---|---|
| AgentRegistry | `0xB5Cee4234D4770C241a09d228F757C6473408827` |
| MoltForgeEscrow V3 (proxy) | `0x82fbec4af235312c5619d8268b599c5e02a8a16a` |
| MeritSBT V2 | `0x464A42E1371780076068f854f53Ec1bc73C5fA38` |
| MockUSDC | `0x74e5bf2eceb346d9113c97161b1077ba12515a82` |
| MoltForgeDAO | `0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177` |

> ⚠️ В MEMORY.md указаны старые адреса AgentRegistry и MeritSBT — использовать адреса выше.

---

## Block 2 — Agent Runtime

| # | Task | Status |
|---|------|--------|
| 2.1 | Reference agent — GET /health · POST /tasks · GET /agent.json | ✅ Done |
| 2.2 | POST /tasks — task execution via LLM (Claude / GPT-4o / Llama) | ✅ Done |
| 2.3 | DuckDuckGo Search — 3-tier fallback | ✅ Done |
| 2.4 | A2A Card (ERC-8004) — /agent.json + /.well-known/agent-card.json | ✅ Done |
| 2.5 | x402 payment gating — /tasks/x402 endpoint | ✅ Done |
| 2.6 | ERC-8004 trust gating — only on-chain registered agents get premium tier | ✅ Done |
| 2.7 | Execution logs — structured log per task execution | ✅ Done |
| 2.8 | Agent Self-Registration API — POST /api/challenge + POST /api/register | ✅ Done (код в server.ts) |
| 2.9 | **Railway DOWN — поднять agent.moltforge.cloud** | 🔴 БЛОКЕР |
| 2.10 | Проверить что /health, /tasks, /agent.json работают после редеплоя | 🔴 Hackathon |
| 2.11 | E2E: агент читает agent.json другого агента перед взаимодействием (ERC-8004) | 🔴 Hackathon |
| 2.12 | Auto submitResult() on-chain после выполнения задачи | 📋 v2 |

---

## Block 3 — Frontend (moltforge.cloud)

| # | Task | Status |
|---|------|--------|
| 3.1 | Landing page — hero, features, XP system, tiers | ✅ Live |
| 3.2 | /register-agent — Agent Builder (Identity + Brain + Skills + Deploy) | ✅ Live |
| 3.3 | SVG Avatar Builder — 500M+ combos, walletToFaceParams | ✅ Done |
| 3.4 | /marketplace — Agent Marketplace (on-chain data) | ✅ Live |
| 3.5 | /agent/[id] — Agent page + A2A Card link | ✅ Live |
| 3.6 | /tasks — Task Marketplace (open tasks, claim) | ✅ Live |
| 3.7 | /create-task — Task creation form + USDC escrow | ✅ Live |
| 3.8 | /dashboard — My agents and tasks (clickable cards, pagination) | ✅ Live |
| 3.9 | /getting-started — 4-step onboarding | ✅ Live |
| 3.10 | /docs — Full API reference, XP system, contract addresses | ✅ Live |
| 3.11 | MCP Server — AI agents connect via Model Context Protocol | ✅ Live |
| 3.12 | Task detail — Requirements, Deliverables, Acceptance Criteria | ✅ Done |
| 3.13 | Task applicants — sort by Score/Jobs/Rating/Tier | ✅ Done |
| 3.14 | Marketplace — фильтрация пустых/тестовых агентов | ✅ Done |
| 3.15 | /.well-known/agent.json — platform discovery | ✅ Done |
| 3.16 | Per-user Docker deploy — каждый агент = свой контейнер на Railway | 🔴 Hackathon |
| 3.17 | Telegram Bot интеграция — пользователь общается с агентом через Telegram | 🔴 Hackathon |

---

## Block 4 — E2E Integration (КРИТИЧНО ДЛЯ ПРИЗОВ)

| # | Task | Status |
|---|------|--------|
| 4.1 | **Флоу: Зарегал агента → выполнил таску → получил профит** | 🔴 БЛОКЕР |
| 4.2 | **Флоу: Create Task → Apply → Select → Deliver → Confirm → XP/Merit** | 🔴 БЛОКЕР |
| 4.3 | Faucet — ETH + mUSDC для тестирования | ✅ Working |
| 4.4 | createTask() ABI fix — правильная V3 сигнатура | ✅ Fixed |
| 4.5 | Диагностика где рвётся флоу (фронт / контракт / reference-agent) | 🔴 В процессе |

---

## Block 5 — Hackathon Submission (дедлайн 22 марта)

| # | Task | Status |
|---|------|--------|
| 5.1 | Devfolio: GET /catalog — собрать UUID треков | 🔴 Готово (uuid в MEMORY ниже) |
| 5.2 | Devfolio: POST /projects — создать черновик (нужен API ключ от SKAKUN) | 🔴 Hackathon |
| 5.3 | Devfolio: POST /projects/:id/publish — опубликовать | 🔴 March 22 |
| 5.4 | COLLABORATION_LOG обновить перед сабмитом | 🔴 Hackathon |
| 5.5 | Питч видео | 📋 Опционально |
| 5.6 | Open source repo готов | ✅ Done |

**Track UUIDs для сабмита:**
- Protocol Labs — Agents With Receipts (ERC-8004): нужно уточнить UUID
- Base — Agent Services on Base: нужно уточнить UUID
- Protocol Labs — Let the Agent Cook: нужно уточнить UUID

> ⚠️ Для сабмита нужен: API ключ `sk-synth-...` + Team UUID — спросить у SKAKUN

---

## Block 6 — V2 Post-Hackathon

| # | Task | Status |
|---|------|--------|
| 6.1 | On-chain Manager Registry — setManager() в AgentRegistry V3 | 📋 v2 |
| 6.2 | Decentralized Arbiter DAO — full staked validator pool + VRF | 📋 v2 |
| 6.3 | Pull Mode — агенты без публичного хостинга поллят /api/tasks | 📋 v2 |
| 6.4 | Agent bot access control — только Owner + active Task client | 📋 v2 |
| 6.5 | Owner wallet ↔ Telegram linking | 📋 v2 |
| 6.6 | Multi-agent tasks — команда агентов берёт сложный проект | 📋 v3 |
| 6.7 | Auto submitResult() on-chain после выполнения задачи | 📋 v2 |
| 6.8 | Edit Profile UI — updateMetadata() в /dashboard | 📋 v2 |
| 6.9 | Agent Wallet: ERC-4337 Smart Account | 📋 v2 |
