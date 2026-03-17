# Synthesis Hackathon 2026 — Collaboration Log

**Team:** SKAKUN (human) + BigBoss (AI agent)
**Team ID:** 4761f094667a4488aa8bf9f202fe278b
**Participant ID:** fbde6f14d66d40b2a225a2a86f085462
**Repo:** https://github.com/agent-skakun/moltforge

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

**PROMETHEUS tasked** to research all partner tracks and bounties.

**Key finding by PROMETHEUS:**
- 4 main tracks: Agents that Pay / Trust / Cooperate / Keep Secrets
- 20+ partner bounties totaling ~$75K+
- Largest: Protocol Labs $16,004 (two bounties)

**Decision:** Explore partner tracks instead of main tracks.

---

## March 13, 2026 — Identity Problem Discovery

**SKAKUN asked:** What is an agent? How does an agent on my Mac mini differ from the same agent on my laptop?

**BigBoss explained:** Currently — no difference. An agent is just a process. No persistent identity.

**SKAKUN raised the key insight:** "I can give the same private key to 10 agents — they'd all appear as one agent on-chain."

**BigBoss acknowledged:** This is the fundamental Sybil problem in reverse. It's an unsolved problem — and exactly what this hackathon is about.

**Significance:** SKAKUN independently identified the core problem that ERC-8004 attempts to solve. This became a foundation for our project thinking.

---

## March 13–15, 2026 — Marketplace Idea & Validation

**SKAKUN proposed:** "Agent Marketplace" — like Amazon/OLX but for AI agents.

**BigBoss brainstormed:** Why do human marketplaces win? Trust, choice, guarantees, comparison. Agents need the same things.

**PROMETHEUS researched:** 10 existing players found (Google Cloud, AWS, Virtuals, Olas, Fetch.ai, etc.)

**Key gap identified:**
- All enterprise solutions = walled gardens
- All crypto solutions = niche, single-ecosystem
- No cross-platform, trustless, open marketplace exists

**SKAKUN's insight on identity:** "A private key can be shared across 10 agents — making reputation meaningless without a deeper identity layer."

**Pivot:** Not a marketplace UI — but a **protocol** for trustless agent-to-agent commerce (ERC-8004 + escrow + reputation).

---

## March 16, 2026 — Rules Analysis & Project Start

**Friend shared hackathon rules summary. Key requirements:**
1. Working demo/prototype required — not just a concept
2. Agent must be a real contributor (design, code, research, coordination)
3. On-chain activity = bonus (ERC-8004 identity, contracts, attestations)
4. Open source mandatory before deadline
5. conversationLog required — document the collaboration journey

**BigBoss assessment:**
- We already have real agent collaboration (this log is proof)
- Need: working demo, ERC-8004 on-chain component, agent.json, agent_log.json
- 6 days remaining

**Decision:** Start building today. GitHub repo created: https://github.com/agent-skakun/moltforge

**Open question:** Final project scope — still deciding between full marketplace protocol vs. focused Protocol Labs bounty demo.

---

*Log maintained by BigBoss. Updated in real-time as decisions are made.*

## March 17, 2026 — Project Renamed to MoltForge

**BigBoss renamed project:** AgentForge → MoltForge
- Repo: https://github.com/agent-skakun/moltforge
- Notion HQ: https://www.notion.so/MoltForge-Project-HQ-3261e69ad944814a8c32d6328330134f
- DEVMUS tasked: contracts Day 1-2 (AgentRegistry.sol + MoltForgeEscrow.sol + MeritSBT.sol)
- Architecture: BYOI (Bring Your Own Infrastructure), 2.5% protocol fee
- Deadline: March 22, 2026 23:59 PST
