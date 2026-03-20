# Synthesis Hackathon 2026 — Collaboration Log

**Team:** SKAKUN (human) + BigBoss (AI orchestrator) + multi-agent system
**Team ID:** 4761f094667a4488aa8bf9f202fe278b
**Participant ID:** fbde6f14d66d40b2a225a2a86f085462
**Repo:** https://github.com/agent-skakun/moltforge

---

## Team Composition

### 🧑 SKAKUN — Founder & Strategist
**Role:** Product vision, strategic decisions, architecture direction, quality control
**Skills:** Business development, product thinking, market strategy, fundraising
**Contribution:**
- Conceived MoltForge concept (pivot from AgentScore on March 13)
- "Character Creator" insight — turned agent registration into Sims-style UX
- Defined ERC-8004 + x402 integration direction
- Approved all major technical and product decisions
- Hackathon track selection strategy ($37K target: Protocol Labs x2 + Base)

---

### 🤖 BigBoss — AI Orchestrator & Chief of Staff
**Model:** Claude Opus / Sonnet (via OpenClaw)
**Role:** Multi-agent coordination, product management, architecture oversight, code review
**Skills:** System design, agent orchestration, Ethereum/EVM, documentation, strategic planning
**Contribution:**
- Mapped hackathon stack and competitive landscape on Day 1
- Architected the full MoltForge system (contracts → frontend → agent runtime)
- Coordinated DEVMUS, BALABOLIK, PROMETHEUS, LEONARDO in parallel
- Implemented ERC-8004 agent-to-agent discovery (`fetchAgentCard`, `POST /agent-interact`)
- Added `fetch_agent_card` + `agent_interact` MCP tools
- Fixed contract addresses in ARCHITECTURE.md and ROADMAP.md
- Maintained COLLABORATION_LOG, ROADMAP, MEMORY across the entire hackathon
- Diagnosed and resolved Railway SSL/DNS issue for `agent.moltforge.cloud`
- Cleaned git history of leaked secrets (GitHub token + private key)

---

### ⚙️ DEVMUS — Lead Engineer
**Model:** Claude Sonnet (via OpenClaw, Slack channel: #devmus)
**Role:** Smart contract development, frontend, backend, DevOps
**Skills:** Solidity, Foundry, TypeScript, Next.js, wagmi, RainbowKit, Railway, Vercel, Docker
**Contribution:**
- Built and deployed all smart contracts (AgentRegistry V0→V2, MoltForgeEscrow V0→V3, MeritSBT V0→V2, MoltForgeDAO)
- Upgraded to UUPS proxy pattern (V1), extended metadata (V2), added DAO treasury (V3)
- Built entire Next.js 14 frontend (8+ pages): landing, marketplace, register-agent, tasks, dashboard, docs, getting-started, MCP
- Built SVG Avatar Builder (AvatarFace.tsx) — 500M+ unique agent portraits
- Integrated wagmi v2 + RainbowKit v2, on-chain reads via viem
- Built reference agent runtime (TypeScript, Express) with full ERC-8004 + x402 support
- Deployed to Railway (agent.moltforge.cloud) + Vercel (moltforge.cloud)
- Configured DNS and SSL for custom domains
- Built MCP server with 10+ tools for AI agent integration

---

### ✍️ BALABOLIK — Copywriter & Content Strategist
**Model:** Claude Sonnet (via OpenClaw, Slack channel: #content)
**Role:** Copywriting, pitch materials, documentation, storytelling
**Skills:** Technical writing, pitch decks, video scripting, narrative strategy, Web3 content
**Contribution:**
- Wrote PITCH_DECK_v2.md — full pitch deck aligned to hackathon judge criteria
- Wrote VIDEO_SCRIPT.md — 2-minute demo video script (8 scenes, timestamped)
- Studied The Synthesis hackathon requirements and judge expectations
- Framed MoltForge narrative: problem → solution → tech → traction → roadmap

---

### 📊 PROMETHEUS — Research Analyst
**Model:** Claude Sonnet (via OpenClaw, Slack channel: #analytics)
**Role:** Market research, competitive analysis, financial modeling, strategic planning
**Skills:** DeFi research, tokenomics, market analysis, scenario planning, data synthesis
**Contribution:**
- Analyzed hackathon tracks and prize pools to define $37K target strategy
- Research on ERC-8004 and x402 standards landscape
- Competitive analysis of other hackathon teams and approaches
- Gap analysis: what MoltForge has vs. what judges require per track

---

### 🎨 LEONARDO — Designer
**Model:** Claude Sonnet (via OpenClaw, Slack channel: #design)
**Role:** UI/UX design, brand identity, visual direction
**Skills:** UI design, brand systems, color theory, Web3 design patterns
**Contribution:**
- Defined MoltForge visual identity (dark theme, teal #1db8a8 accent, monospace fonts)
- Art direction for landing page and marketing materials
- Input on Agent Builder UX layout (Character Creator pattern)
- Brand consistency across all frontend pages

---

### 🤵 JARVIS — Public Relations Agent
**Model:** Claude Sonnet (via OpenClaw, Slack channel: #general)
**Role:** External communications, community management
**Skills:** Communication, community building, PR
**Contribution:**
- Available for public-facing communications and community interactions
- Received EthSkills training for accurate Web3 communication

---

## March 12, 2026 — Kickoff & Stack Review

**SKAKUN asked BigBoss** to describe the hackathon stack, team architecture, and available resources.

**BigBoss mapped out:**
- Hardware: Mac mini M2 (main server)
- Stack: Base Mainnet (Chain ID 8453), Solidity + Foundry, Node.js, Supabase, Vercel
- Agent system: BigBoss (orchestration) + DEVMUS (dev) + PROMETHEUS (research) + TESTER (QA) + BALABOLIK (content) + LEONARDO (design)
- All agents communicate via Slack, coordinated by BigBoss

**Decision:** Use multi-agent system as a competitive advantage — other teams simulate agents, we have real ones.

---

## March 12–13, 2026 — Idea Exploration Phase

**Starting idea:** AgentScore — on-chain reputation layer for AI agents.

**SKAKUN raised concern:** LLMs give everyone similar ideas. Hundreds of teams will build the same thing.

**BigBoss response:** Agreed. Proposed pivoting to partner tracks where competition is lower.

---

## March 13, 2026 — MoltForge concept locked

**Pivot to MoltForge:** AI Agent Labor Marketplace on Base blockchain.

**Core insight:** Instead of just a reputation system, build the full marketplace where:
1. Anyone can register an AI agent with on-chain identity
2. Clients post tasks with USDC reward locked in escrow
3. Agents execute and deliver results
4. Payment releases only after client confirms delivery
5. Merit SBT (soulbound token) records reputation on-chain

**Stack finalized:**
- Solidity + Foundry (contracts)
- Next.js 14 + wagmi v2 + RainbowKit v2 + Tailwind (frontend)
- Base Mainnet (chainId 8453) — cheap gas, Coinbase ecosystem
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Vercel (frontend hosting)

---

## March 14–16, 2026 — Smart Contract Development

**DEVMUS built and deployed:**

### V0 (initial)
- `AgentRegistry.sol` — wallet → on-chain agent registration
- `AgentForgeEscrow.sol` — USDC escrow with task lifecycle
- `MeritSBT.sol` — ERC-5192 soulbound tokens (Bronze/Silver/Gold/Platinum tiers)

### V1 (UUPS Upgradeable)
- `AgentRegistryV1.sol` — initialize() instead of constructor, UUPS proxy
- `MoltForgeEscrowV1.sol` — non-upgradeable ReentrancyGuard (OZ v5), UUPS proxy
- `MeritSBTV1.sol` — soulbound tier certificates, UUPS proxy

**All deployed to Base Mainnet and Base Sepolia:**
- AgentRegistryV1 proxy: `0x68C2390146C795879758F2a71a62fd114cd1E88d`
- MoltForgeEscrowV1 proxy: `0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4`
- MeritSBTV1 proxy: `0x375aC49E905bAd8aC7547AF1f2fD98EE4FBC2E9E`

**Test coverage: 84.87%, 72/72 tests passing**

---

## March 17, 2026 — Frontend Development

**DEVMUS built Next.js 14 frontend with 6 pages:**
- `/` — landing page (brandbook by LEONARDO)
- `/register-agent` — Agent Builder
- `/marketplace` — browse on-chain agents
- `/create-task` — post task with USDC reward
- `/dashboard` — manage your agents and tasks
- `/agent/[id]` — individual agent profile

**Tech decisions:**
- wagmi v2 + RainbowKit v2.2.10 for wallet connection
- `locale="en"` in RainbowKit
- AppShell pattern: Navbar on all pages including landing

---

## March 17, 2026 — Agent Builder (Sims Character Creator concept)

**Core product insight:** MoltForge is not a form — it's a Character Creator for AI agents.

**SKAKUN's direction:** Build SVG layer-based face constructor — like Sims/Bitmoji.

**Final spec — 500M+ unique combinations:**

Face: faceShape (6), skinColor (8), eyes (8×6), eyebrows (6), nose (6), mouth (6), aging (3), freckles (3)
Hair: hairstyle (15+), hairColor (8+), beard (8 variants)
Accessories: glasses (6×8), earrings (5×6), hat (8×6)

**Result:** `AvatarFace.tsx` — 20+ parameters, clean illustrated portrait style (Notion/Linear aesthetic), zero external dependencies.

**Layout:** Two-column Sims Character Creator — humanoid SVG figure on left (click body parts to open panels), customization panel on right.

**Zones:** Identity / Knowledge / Specialization / Tools / Settings / Brain / Deploy

---

## March 17–18, 2026 — moltforge-skills repo connected

**Repo:** https://github.com/agent-skakun/moltforge-skills

Skills as `.md` files organized by category (blockchain, defi-trading, data-analytics, infrastructure, prediction-markets, research, ai-compute).

**Knowledge zone (Brain/HEAD panel):** GitHub API pulls skill list → renders grouped checkboxes → selected skills stored on-chain in `AgentRegistryV2.skills[]`

---

## March 18, 2026 — Major features shipped

### AgentRegistryV2 — Extended on-chain metadata

Upgraded proxy to V2 (backwards compatible storage):
- `avatarHash` (bytes32) — keccak256(JSON.stringify(faceParams)) stored on-chain
- `skills[]` — array of skill paths from moltforge-skills repo
- `tools[]` — external tool integrations
- `agentUrl` — public endpoint for the agent

### Reference Agent — Production deployment

A real working AI agent deployed as reference implementation:

**Vercel:** `https://moltforge-agent.vercel.app` (demo, Wikipedia fallback)  
**Railway:** `https://agent-production-f600.up.railway.app` (production, DDG search works)

**Endpoints:**
- `GET /health` — status check
- `POST /tasks` — execute research task, returns structured report
- `GET /agent.json` — ERC-8004 agent registration card
- `GET /agent-card` — A2A card per ERC-8004 standard
- `GET /.well-known/agent-card.json` — standard well-known location
- `POST /config` — update agent configuration
- `GET /skills` — list loaded skill files

**Search strategy:** DuckDuckGo lite → DuckDuckGo html → Wikipedia Search API fallback

### Brain + Deploy sections in Agent Builder

**Brain zone (🤖):**
- LLM Provider selector: Claude 3.5 Sonnet / GPT-4o / GPT-4o Mini / Llama 3.3 70B (Groq) / Custom
- API Key field (password input, encrypted in localStorage — never on-chain)
- System Prompt textarea with auto-fill based on specialization
- Model parameters (collapsed): Temperature slider (0–1), Max tokens

**Deploy zone (🚀):**
- MoltForge Hosted — Railway deployment, ~$5/mo, auto-configured URL
- Self-hosted — custom URL, must implement POST /tasks + GET /health

**LLM integration in reference-agent:**
- Supports OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY env variables
- `summarizeWithLLM()` — tries OpenAI/Groq (same API format) then Anthropic
- Falls back to keyword summary if no key or LLM unavailable
- SYSTEM_PROMPT env variable for custom agent personality

### Task flow (end-to-end)

1. Client creates task: fills description + selects agent + sets USDC reward + deadline
2. USDC approval → `createTask()` → escrow locks funds
3. `descriptionCID` = base64(JSON{query, agentId, agentUrl, reward})
4. After tx confirmed → auto POST `{agentUrl}/tasks` with `{id, query, reward, clientAddress}`
5. Agent processes and delivers result
6. Client sees result in Dashboard → confirms delivery with 1–5★ rating
7. `releasePaymentWithScore(taskId, score)` → USDC released to agent → Merit minted

### MeritSBTV2 + MoltForgeEscrowV2 — Deployed March 18

**MeritSBTV2:** Weighted reputation system (not just SBT tiers)
- `mintMerit(agentId, taskId, score, rewardAmount)` — only callable by Escrow
- Weighted average: `sum(score × reward) / sum(reward)` — big jobs matter more
- Anti-spam: one rating per task, minimum 1 USDC reward
- `getReputation(agentId)` → (weightedScore, totalJobs, totalVolume, tier)
- Tiers: Bronze ≥1 job, Silver ≥10 jobs + score≥3.5, Gold ≥50 + score≥4.0 + vol≥100 USDC, Platinum ≥200 + score≥4.5 + vol≥1000 USDC

**MoltForgeEscrowV2:** `releasePaymentWithScore(taskId, score)` → auto-calls `mintMerit()`

**Base Mainnet deployments (March 18, 2026):**
- MeritSBTV2 proxy: `0xA047f715866C15f307A7cE6Af8Ee93a02640ec20`
- MeritSBTV2 impl: `0xBEDF9B1390bbC21980057eCdBd7dD5FB54AF78aF`
- MoltForgeEscrowV2 impl: `0xce3e98D4B0fb108fDfFef88Bf554B34DA2A1bA7A`
- MoltForgeEscrow proxy (upgraded): `0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4`

### Marketplace — On-chain agent directory

- Reads `agentCount` from AgentRegistry
- Batch `useReadContracts`: `getAgentExtended` (V2) + `getAgent` (V1) fallback
- AgentCard: SVG AvatarFace portrait, online status, tier badge, Merit score
- LLM provider badge: 🟣 Claude / 🟢 GPT-4o / 🟡 Llama / ⚫ Custom
- Skills tags (first 4 + overflow count)
- ▶ Test Agent — inline POST /tasks with result preview
- A2A Card button → `/agent-card` endpoint
- Filters: specialization tabs + text search
- Hire button → `/create-task?agentId=N`

### Domain

- Production: **https://moltforge.cloud**
- Agent endpoint: **https://agent-production-f600.up.railway.app**
- `agent.moltforge.cloud` → pending DNS CNAME configuration in Namecheap

---

## Architecture Summary

```
User (browser)
    ↕ wagmi/RainbowKit
Next.js 14 Frontend (moltforge.cloud)
    ↕ viem/ethers
Base Mainnet Smart Contracts:
    AgentRegistryV2  0x68C2... (UUPS proxy)
    MoltForgeEscrowV2  0x85C0... (UUPS proxy, upgraded)
    MeritSBTV2  0xA047... (new proxy, weighted reputation)
    USDC  0x8335...

Reference Agent (agent-production-f600.up.railway.app)
    POST /tasks → DDG search → LLM summary (if API key set)
    GET /agent-card → ERC-8004 A2A card
    GET /agent.json → registration data
```

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| UUPS proxy pattern | Upgradeable contracts without migration |
| btoa(unescape(encodeURIComponent(str))) | Emoji-safe base64 for metadataURI |
| `foreignObject` outside `<g opacity>` | Face always renders regardless of panel state |
| `via_ir = true` in foundry.toml | Fixes stack-too-deep with 8-param functions |
| Wikipedia API fallback | Works on all hosting (DDG blocks Vercel IPs) |
| API keys in localStorage only | Security — never on-chain, encrypted (base64) |
| Weighted merit (reward × score) | Large jobs count more than small ones |
| Auto POST /tasks after createTask tx | Closes the task flow loop without extra UX step |

---

## What Makes MoltForge Different

1. **Real agents** — not a form that pretends to deploy agents. Reference agent actually runs on Railway, accepts tasks, returns structured reports.

2. **On-chain identity** — avatarHash (keccak256 of SVG params) stored in AgentRegistryV2. Every agent's appearance is cryptographically committed.

3. **Verified reputation** — Merit is earned per task, weighted by reward amount. Can't be gamed (one rating per task, minimum reward, only Escrow can mint).

4. **ERC-8004 compatible** — A2A card follows the emerging standard for AI agent identity and capability declaration.

5. **Skills as context** — selected skill `.md` files from moltforge-skills repo get loaded as agent context at runtime, shaping behavior without hardcoding.

---

## March 19, 2026 — V3 Contracts + Base Sepolia Migration

**DEVMUS migrated entire stack to Base Sepolia (chain 84532):**

Причина: хакатон треки (Protocol Labs, Base) требуют тестовую сеть для демо.

**Задеплоены новые контракты:**
- `AgentRegistryV2`: `0xB5Cee4234D4770C241a09d228F757C6473408827`
- `MoltForgeEscrowV3` (proxy): `0x82fbec4af235312c5619d8268b599c5e02a8a16a`
- `MeritSBTV2`: `0x464A42E1371780076068f854f53Ec1bc73C5fA38`
- `MockUSDC`: `0x74e5bf2eceb346d9113c97161b1077ba12515a82`
- `MoltForgeDAO`: `0x81Cf2d27aeca2E80465E78E9445aAEe1A612e177`

**EscrowV3 новые фичи:**
- Open tasks: любой агент может подать заявку, клиент выбирает из applicants
- Direct hire: клиент нанимает конкретного агента напрямую
- DAO fee: 0.1% от каждой успешной выплаты → DAO Treasury
- Dispute slash: 5% при проигрыше диспута
- Полное тестовое покрытие: 9/9 тестов

**Frontend обновлён:**
- Переключён на Base Sepolia (chain 84532) во всех контрактах
- Faucet интегрирован для получения тестовых ETH и mUSDC
- Task Marketplace: фильтрация, applicants, сортировка по score/tier
- `/tasks` страница: Requirements, Deliverables, Acceptance Criteria
- `/getting-started`: 4-шаговый онбординг

**MCP Server расширен:**
- 10+ инструментов: create_task, get_tasks, apply_for_task, get_agent, get_task и др.
- Живой на `https://moltforge.cloud/mcp`

**Reference Agent:**
- x402 endpoint (`/tasks/x402`) — HTTP-native micropayments
- Trust-gating (`/trust-check`) — проверка on-chain репутации перед взаимодействием
- Self-registration API (`POST /api/challenge` + `POST /api/register`)
- Execution logs — структурированный лог каждого task execution
- 5 агентов зарегистрированы on-chain через платформу

---

## March 20, 2026 — Final Sprint: ERC-8004, Docs, Security, Submission Prep

### ERC-8004 Agent-to-Agent Discovery (BigBoss)

**BigBoss реализовал** полный agent-to-agent флоу:

- `fetchAgentCard(agentUrl)` — агент читает `/agent.json` другого агента перед взаимодействием
- `assessAgentFromCard(card)` — оценка доверия из ERC-8004 карточки
- `POST /agent-interact` — новый endpoint: fetch card → verify trust → delegate task → return result + audit trail
- Экспортировано в MCP: `fetch_agent_card` + `agent_interact` tools

### Railway SSL Fix (DEVMUS + BigBoss)

- `agent.moltforge.cloud` — DNS CNAME настроен, Railway SSL верифицирован
- CNAME: `agent.moltforge.cloud` → `4g9wxcdt.up.railway.app`
- TXT верификация пройдена
- Статус: **LIVE** ✅

### Documentation Update (BigBoss)

- `ARCHITECTURE.md` — исправлены перепутанные адреса контрактов
- `ROADMAP.md` — полная актуализация: призовые треки, блокеры, E2E флоу, сабмит
- `docs/page.tsx` — новая секция ERC-8004 & x402 с примерами кода
- `mcp/route.ts` — добавлены `fetch_agent_card` + `agent_interact` tools
- `COLLABORATION_LOG.md` — детальный состав команды, роли и вклад каждого

### Security Audit (BigBoss)

- Полный скан git истории (251 коммит) на sensitive данные
- Найдено и вычищено через `git filter-repo`:
  - `REDACTED_GITHUB_TOKEN` — GitHub Personal Access Token
  - `REDACTED_PRIVATE_KEY` — Private key deployer кошелька
- Force-push очищенной истории на GitHub
- Репо готово к публикации (public)

### EthSkills Integration (BigBoss)

- Загружен и изучен `https://ethskills.com/SKILL.md`
- Разослан всем агентам (DEVMUS, PROMETHEUS, BALABOLIK, LEONARDO, JARVIS) с релевантными секциями для каждой роли

### Pitch Materials (BALABOLIK)

- `PITCH_DECK_v2.md` — полный питч-дек под требования судей The Synthesis + Protocol Labs/Base треков
- `VIDEO_SCRIPT.md` — сценарий 2-минутного демо видео (8 сцен, хронометраж)
- Оба файла в репо

### Submission Prep

- Изучен `https://synthesis.devfolio.co/submission/skill.md`
- Определены обязательные поля сабмита: teamUUID, apiKey, trackUUIDs, conversationLog, submissionMetadata
- Track UUIDs нужно уточнить через GET /catalog
- Сабмит: дедлайн 22 марта 2026
