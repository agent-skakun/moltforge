# AgentScore: Verified Reputation for AI Agents in Crypto
## Comprehensive Research Document

> **Version:** 1.0 MASTER  
> **Date:** March 7, 2026  
> **Project:** The Synthesis Hackathon 2026 — "Agents that trust" track  
> **Status:** Ready for pitch

---

## 1. EXECUTIVE SUMMARY

### The Problem

The world is giving AI agents access to real money, protocols, and critical systems — without any standard for verifying their reliability. Hundreds of AI agents trade on DeFi, bet on prediction markets, and manage yield strategies — yet none of them have a "passport," a confirmed history, or a way to prove they follow their declared risk parameters. An investor wanting to give an agent $10K for rebalancing literally has no tools to verify — except "trust me."

### Market Context: Why Now

2025–2026 is a turning point for the agent economy. OpenAI, Anthropic, and Google launched production-ready agent frameworks. DeFAI (Decentralized Finance + AI) became the #1 trend. TVL under agent management is growing. Regulators (EU AI Act) require auditability. Yet none of the existing protocols — neither dHEDGE ($33M TVL), nor Enzyme ($200M AUM), nor Giza, nor Bittensor — provides public, verified, cross-protocol reputation for AI agents. **The market for agent trust doesn't exist. Yet.**

### Our Solution

**AgentScore** — the first verified, on-chain, cross-protocol reputation layer for AI agents in crypto. An agent registers once — and its trading history, predictions, yield management, and risk parameter adherence are aggregated into a single, unforgeable score. For humans — an intuitive visual profile. For other agents — a JSON API in one line.

### Why This Wins

| Factor | Description |
|--------|-------------|
| 🎯 **Vacant niche** | No competitor solves cross-protocol reputation for AI agents |
| 🔗 **Data available** | Polymarket, dHEDGE, Enzyme, Aave have public APIs right now |
| 💡 **Timing** | AI agents + DeFi = top trend 2026, trust problem becoming critical |
| 🏆 **Hackathon fit** | "Agents that trust" — that's literally us |
| 🤖 **Meta-demo** | BigBoss — first registered agent, reputation built in real-time |

---

## 2. THE PROBLEM

### 2.1 Academic Background

The scientific community has documented the problem — and is only beginning to propose solutions.

**Qi et al. (arXiv:2509.16736, September 2025)** — first comprehensive blockchain framework for LLM agent reputation: on-chain registration, dynamic reputation tracking via smart contracts, matching score based on reputation + capability + workload. Results from 50-round simulation show stable utility distribution and emergent specialization. **Problem:** system trusts self-reported data, no external verification.

**Acharya (arXiv:2511.15712, November 2025)** — framework for verifying AI transactions: DID for agent identities, on-chain intent proofs, ZKP for privacy, TEE attestations for integrity. Solves the payment side, but **not performance reputation**.

**Vaziry et al. (arXiv:2507.19550, July 2025)** — extension of Agent2Agent protocol: on-chain AgentCards as smart contracts, tamper-proof identities via DLT, x402 micropayments. Solves **identity + discovery**, but AgentCards are static business cards without living history.

**Xu (arXiv:Feb 2026)** — conceptual "Agent Economy" where agents are economic peers of humans with legal identity and rights to hold assets. Confirms: the field is hot, but no implementations exist.

#### Key Scientific Problems (Systematized)

| Problem | Essence | AgentScore Solution |
|---------|---------|---------------------|
| **Identity problem** | Agents have no persistent, verifiable identity | DID + on-chain registration |
| **Verification problem** | Self-reported data can't be trusted | On-chain history from protocols |
| **Incentive misalignment** | Without reputation stakes, no motivation to work honestly | Score as economic asset |
| **Sybil attacks** | One actor creates thousands of "clean" agents | Wallet-anchored DID + minimum history |
| **Byzantine behavior** | Agent intentionally sabotages | Public track record, can't hide |
| **MCP Tool Manipulation** | Agents receive misleading instructions | Attestation layer independent of agent |

### 2.2 Real Market Gap

The problem isn't theoretical. Here are concrete market facts:

- **dHEDGE** shows "Score" in its leaderboard — but **methodology isn't disclosed**. You see a number, don't understand what it means.
- **Numerai** verifies ML models — but only on stocks with a 20-day lag, data is obfuscated.
- **Giza** (gizatech.xyz) positions itself as "Verifiable by Design" — all actions auditable — but no aggregated score, no agent comparison, AUM currently $0.
- **Bittensor** has incentive mechanism for ML miners — but only within its closed ecosystem.
- **Polymarket** has the best API in its class — but predictors have no public reputation profile.

**No project solves:**
1. Public comparison of agents against each other
2. Verification that an agent follows its declared risk management
3. Cross-protocol reputation (agent worked in Giza + Polymarket + dHEDGE)
4. Machine-readable format for other agents

### 2.3 Concrete User Scenarios

> 💬 **"I want to give an agent $10K for rebalancing — how do I know if I can trust it?"**
> 
> Now: look at marketing materials, zero verification. AgentScore: open profile, see 14 months of on-chain history, Sharpe 1.84, max drawdown -12.3% against declared limit of -15% — Risk Discipline Score 95/100.

> 💬 **"I'm a developer, my agent wants to hire another agent for market prediction — how can it verify reliability?"**
>
> Now: impossible to automate. AgentScore: `GET /api/v1/agents/{id}/score` → JSON with full profile in 100 milliseconds.

> 💬 **"I'm launching a DeFi protocol and want to integrate AI agents — but how to select the best?"**
>
> Now: reputation protocol simply doesn't exist. AgentScore: leaderboard with filters by category, timeframe, risk level.

---

## 3. COMPETITOR LANDSCAPE

### 3.1 Full Competitive Table

| Project | Category | Users / AUM | What It Does | Has Reputation? | Weaknesses | UX Rating |
|---------|----------|-------------|--------------|-----------------|------------|-----------|
| **Giza** (gizatech.xyz) | AI agents for on-chain capital | AUM: $0 (just launched) | Autonomous agents: rebalancing, yield optimization. SDK, MCP Server, REST API, TypeScript SDK. Dashboard with APR and transactions | ❌ No public score | "Verifiable by Design" — audit exists, but no aggregated score; no agent comparison; no risk parameter verification | 6/10 |
| **dHEDGE** | On-chain fund management | $33.1M TVL, 2168 managers, 3491 vaults | DeFi vaults on Base/Arbitrum/Optimism. Return%, Risk 1-5, Score | ⚠️ Partially (Score exists, methodology closed) | Opaque score — no explanation; no Sharpe, max drawdown, win rate; no AI agent specifics | 7/10 |
| **Enzyme Finance** | On-chain asset management | $200M AUM, $7B+ transaction volume | Infrastructure for on-chain funds. NAV, returns, on-chain history | ❌ No | No leaderboard with simple metrics; GraphQL API needs development; enterprise shift | 5/10 |
| **Numerai** | ML predictions tournament | ~10K data scientists, private hedge fund | ML models compete, stake NMR, hedge fund trades based on Meta Model | ✅ Yes (CORR, MMC, 1Y Reputation) | Stocks only; 20-day lag; obfuscated data; no crypto; no cross-protocol | 6/10 |
| **Bittensor** | Decentralized ML network | Thousands of miners, TAO ~$1-3B cap | Miners compete, validators evaluate, TAO rewards. Trading subnets (SN8, SN29) | ✅ Yes (in subnets, non-standardized) | Only within Bittensor; incomprehensible to non-technical; no standard metrics; validator bias | 3/10 |
| **Polymarket** | Prediction markets | Hundreds of thousands, $3B+ volume/year | Largest prediction market. Event trading, rich API | ❌ No public predictor profile | No Brier score/calibration in UI; no aggregated predictor reputation; bot trading not marked | 8/10 (trading), 3/10 (reputation) |
| **Manifold Markets** | Play-money predictions | ~100K users | Calibration tracking, Brier score, P&L leaderboard | ✅ Yes (calibration, P&L) | Play-money, no serious stakes; no crypto specifics; no cross-platform | 7/10 |
| **Fetch.ai / AgentVerse** | Agent marketplace | N/A | Almanac smart contract: on-chain agent registration, discovery | ❌ No | Registration and discovery only; no performance data; no ratings | 5/10 |
| **Autonolas / Olas** | Agent framework | N/A | Decentralized AI agents with Safe wallet. On-chain registration, staking | ❌ No | Focus on composition and staking, not performance history; no public score | 4/10 |
| **Orange Protocol** | Reputation protocol (Web3) | N/A | Trustless Web3 reputation via zkTLS. Human reputation (DeFi activity, social) | ⚠️ Partially (for humans) | For HUMANS, not agents; DeFi-centric (Uniswap, AAVE); no agent performance concept | 5/10 |
| **Karma3 Labs** | Reputation engine | N/A | On-chain reputation via EigenTrust. Farcaster, Lens integration | ⚠️ Partially (social graph) | For humans/accounts; social graph based; no agent tasks/outcomes | 5/10 |
| **Gauntlet Network** | Risk management (B2B) | Aave, GMX, Jupiter — top DeFi | Simulation-based risk management for protocols. Stress testing | ❌ No public | B2B closed; no agent-level reputation; enterprise only | N/A (B2B) |
| **Chaos Labs** | Risk analytics (B2B) | $10B secured, $5T processed | AI-driven risk engine. Oracle manipulation detection. Real-time recommendations | ❌ No public | B2B closed; no agent scores; enterprise only | N/A (B2B) |
| **EAS** | Attestation infrastructure | 8.7M+ attestations | Universal attestation layer. Machine-to-Machine supported | ⚠️ Infrastructure | It's infrastructure, not a ready solution; who makes attestations — undefined | Dev-facing |
| **Gitcoin Passport** | Sybil resistance | N/A | Credential aggregation, humanity score | ❌ No | For humans; proof of humanity, not proof of agent quality | 6/10 |

### 3.2 Competitor Landscape Conclusion

**"Capital Management" cluster** (dHEDGE, Enzyme, Giza): good on-chain transaction verification, but score is either opaque (dHEDGE) or absent (Enzyme, Giza). Nobody compares agents against each other.

**"Prediction Markets" cluster** (Polymarket, Manifold, Numerai): Numerai is the only one with real verifiable performance, but narrow (stocks only). Polymarket has the best API, no reputation layer. Manifold has good methodology, no crypto stakes.

**"Agent Infrastructure" cluster** (Fetch.ai, Autonolas, EAS): solve identity and discovery, but not performance history.

**"Risk Management" cluster** (Gauntlet, Chaos Labs): institutional-grade, but B2B, closed.

> **Key Conclusion:** No project combines cross-protocol history + verified score + AI agent specifics + dual UX (human + machine). **The niche is completely vacant.**

---

## 4. THE VACANT NICHE

### 4.1 Precise Gap Description

The vacant niche is the intersection of four unmet needs:

```
Cross-protocol history × Verified score
       ×                        ×
AI agent specifics     × Dual UX (human + machine)

       = AgentScore
```

**What specifically is missing from the market:**

1. **Public agent comparison** — no leaderboard where you can compare a dHEDGE agent with a Polymarket agent by a unified metric
2. **Risk adherence verification** — no tool that checks: "Agent declared max drawdown -15% — did it actually follow that?"
3. **Cross-protocol reputation** — an agent worked in Giza + Polymarket + dHEDGE, but its reputation exists in three isolated places, unconnected
4. **Machine-readable agent profile** — no JSON/API standard for one agent to automatically evaluate another agent's reputation

### 4.2 Why Crypto-Specific

Crypto is the ideal testing ground for agent reputation for several reasons:

**Data is already on-chain.** Every agent trade on Uniswap, every bet on Polymarket, every move in dHEDGE — is a public, immutable fact on the blockchain. No "trust me" — everything is verifiable.

**Financial metrics are objective.** Unlike "wrote good code" or "gave useful advice," crypto metrics are unambiguous: Sharpe ratio, max drawdown, Brier score. They can't be disputed.

**Stakes are real.** When an agent manages $10K — that's real money, real risk. Not play-money (like Manifold), not obfuscated data (like Numerai). Skin in the game.

**Market is growing fast.** DeFAI (DeFi + AI) is the #1 trend in 2025-2026. Giza, Morpho AI, Olas — dozens of protocols are integrating AI agents. Demand for evaluating their quality will only grow.

**Regulation is coming.** EU AI Act requires auditability for AI systems. A reputation layer is a natural fit with compliance requirements.

---

## 5. OUR SOLUTION: AgentScore

### 5.1 Concept

> **"Verifiable crypto-native reputation for AI agents"**

AgentScore is an open standard and public registry of verified reputation for AI agents in crypto. An agent registers once via DID (Decentralized Identity), after which its public on-chain history from all supported protocols is aggregated into a single score — impossible to forge, understandable to humans, readable by machines.

**Key principles:**
- **Open by design** — open standard, anyone can build on top
- **On-chain first** — only verifiable data, no self-reporting
- **Dual-layer UX** — one score, two consumption modes
- **Cross-protocol** — not tied to one protocol or ecosystem

### 5.2 Five Components of AgentScore

**AgentScore = weighted sum of 5 components (each 0–100)**

#### Component 1: Performance Score (weight 30%)

How well the agent earns money relative to risk.

```
Performance = weighted average:
  - PnL % (risk-adjusted, vs benchmark BTC/ETH) — 50%
  - Sharpe Ratio (annualized, crypto-adapted) — 30%
  - Win Rate — 20%

Normalization: Sharpe 2.0+ → 100, Sharpe < 0 → 0
Benchmark: BTC (default) or ETH for DeFi agents
```

#### Component 2: Risk Discipline Score (weight 25%) — **Key Innovation**

Whether the agent follows its own declared risk parameters.

```
RiskDiscipline = adherence to declared parameters:
  - Max Drawdown actual vs declared limit — 40%
  - Position sizing adherence — 30%
  - Protocol diversification — 30%
```

> **Why this is innovative:** When registering, an agent DECLARES parameters ("max drawdown no more than -15%"). AgentScore checks on-chain history: was this actually followed? This verification exists nowhere else in the industry.

#### Component 3: Prediction Accuracy Score (weight 20%)

For agents working on prediction markets.

```
PredictionAccuracy:
  - Brier Score (normalized, 0=perfect) — 50%
  - Calibration score — 30%
  - ROI per prediction — 20%

For agents without prediction markets → neutral component (doesn't affect total)
```

#### Component 4: Consistency Score (weight 15%)

Performance stability over time. Protection against cherry-picking.

```
Consistency:
  - Rolling 30D / 90D / 365D score stability
  - % periods with positive performance
  - Recency weight: last 90D = 50% of weight

Goal: can't show 1 lucky month and hide 11 bad ones
```

#### Component 5: Transparency Score (weight 10%)

How verifiable and transparent the agent's history is.

```
Transparency:
  - % of trades on-chain (verifiable) — 50%
  - Declared parameters documented — 25%
  - Minimum activity threshold met — 25%

Bonus: +10% for fully on-chain history without off-chain gaps
```

**Final formula:**
```
AgentScore = 0.30 × Performance
           + 0.25 × RiskDiscipline
           + 0.20 × PredictionAccuracy
           + 0.15 × Consistency
           + 0.10 × Transparency
```

**Tiers:**

| Score | Tier | Meaning |
|-------|------|---------|
| 0–20 | 🔘 Unproven | New agent, no history |
| 21–40 | 🔵 Emerging | Beginning to build track record |
| 41–60 | 🟡 Established | Enough history for evaluation |
| 61–80 | 🟢 Trusted | Stable, verified reputation |
| 81–100 | 🏆 Elite | Exceptional history, top 5% |

### 5.3 Differentiators vs Competitors

| Feature | dHEDGE | Numerai | Polymarket | Giza | AgentScore |
|---------|--------|---------|------------|------|------------|
| Cross-protocol score | ❌ | ❌ | ❌ | ❌ | ✅ |
| On-chain verification | ✅ | ❌ | ⚠️ | ⚠️ | ✅ |
| Machine-readable API | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Human-friendly UI | ✅ | ⚠️ | ✅ | ⚠️ | ✅ |
| AI agent specific | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Risk adherence tracking | ❌ | ❌ | ❌ | ❌ | ✅ |
| Prediction markets included | ❌ | ❌ | ⚠️ | ❌ | ✅ |
| Open standard | ❌ | ❌ | ❌ | ❌ | ✅ |
| Transparent methodology | ❌ | ✅ | ❌ | ❌ | ✅ |

### 5.4 Pitch in One Paragraph

> Every Uber driver has a rating. Every Upwork freelancer has reviews. But AI agents — which are now given access to wallets, DeFi protocols, and trading strategies worth hundreds of thousands of dollars — have nothing. **AgentScore** is the first verified, on-chain, cross-protocol reputation layer for AI agents in crypto. One score from real on-chain history, visually understandable to humans and readable by other agents via JSON API. Before trusting an agent with money — make sure it earned that trust.

---

## 6. HACKATHON MVP

### 6.1 Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Blockchain** | Base (Sepolia testnet → Mainnet) | Cheap gas, EVM-compatible, Coinbase ecosystem, ETH-aligned |
| **Attestations** | EAS (Ethereum Attestation Service) | Public good, 8.7M+ attestations, ready infra, Machine-to-Machine |
| **Identity** | DID:ethr | W3C standard, simple integration, portable |
| **Storage** | IPFS | For evidence, metadata, agent capabilities |
| **Smart Contracts** | Solidity + Foundry | Industry standard |
| **Backend API** | Node.js / TypeScript | Fast, typed, NPM ecosystem |
| **Frontend** | Next.js + Tailwind | Fast, one-click Vercel deploy |
| **Data Sources** | Polymarket API + dHEDGE SDK + Aave subgraph | Public, well-documented |
| **Score Engine** | Python (pandas, numpy) | Financial calculations, Sharpe/Brier |

### 6.2 What NOT to Build (out of scope)

| What | Why Not |
|------|---------|
| ❌ ZKP (Zero-Knowledge Proofs) | Months of development, not needed for MVP |
| ❌ TEE / SGX attestations | Requires special infrastructure |
| ❌ Staking mechanism | Add in V2 post-hackathon |
| ❌ Cross-chain (multiple L2s) | Base is enough for demo |
| ❌ Automatic outcome verification | MVP: trusted attesters (humans + contracts) |
| ❌ Mobile app | Web-first is enough |
| ❌ Token launch | Not needed for product, would distract |

---

## 7. WHY THIS WINS AT THE HACKATHON

### 7.1 Fit with "Agents that Trust" Track

Hackathon prompt:
> *"Identity without a body. Verification without a name. Reputation without a human. Build systems that let agents prove who they are, and catch the ones that lie."*

AgentScore answers every part of this challenge:

| Hackathon Requirement | Our Answer |
|-----------------------|------------|
| "Identity without a body" | DID:ethr — agent has persistent on-chain identity |
| "Verification without a name" | EAS attestations — verification through facts, not personal identity |
| "Reputation without a human" | On-chain score — automatically from protocols |
| "Prove who they are" | AgentRegistry + track record |
| "Catch the ones that lie" | Risk Discipline Score — reveals discrepancy between claims and facts |

### 7.2 Unique Differentiators

**1. Concrete, measurable problem.** Not abstract "trust" — a specific scenario: "$10K to an agent, how to verify?" Judges will appreciate problem clarity.

**2. Data exists.** Polymarket, dHEDGE, Aave — real on-chain data right now. This isn't a dataless prototype, it's a working product with living history.

**3. Risk Discipline Score — exists nowhere else.** No competitor verifies correspondence between declared and actual risk parameters. This is a genuinely new idea.

**4. Open standard.** We're not building "yet another product" — we're proposing an industry standard. This is the narrative of winners.

**5. Scalability is obvious.** Today — 15 agents in demo. Tomorrow — any agent in the ecosystem via SDK in 3 lines. Judges understand this.

---

## 8. SOURCES

### 8.1 Academic Papers

1. **Qi, M. et al.** (September 2025) "Towards Transparent and Incentive-Compatible Collaboration in Decentralized LLM Multi-Agent Systems: A Blockchain-Driven Approach" — arXiv:2509.16736

2. **Acharya, V.** (November 2025) "Secure Autonomous Agent Payments: Verifying Authenticity and Intent in a Trustless Environment" — arXiv:2511.15712

3. **Vaziry, A., Rodriguez Garzon, S., Küpper, A.** (July 2025) "Towards Multi-Agent Economies: Enhancing the A2A Protocol with Ledger-Anchored Identities and x402 Micropayments" — arXiv:2507.19550

4. **Xu, M.** (February 2026) "The Agent Economy: A Blockchain-Based Foundation for Autonomous AI Agents" — arXiv:Feb 2026

### 8.2 Protocols and Standards

- **Ethereum Attestation Service (EAS):** https://attest.org — 8.7M+ attestations, Machine-to-Machine supported
- **ERC-6551 Token Bound Accounts:** https://eips.ethereum.org/EIPS/eip-6551
- **ERC-7683 Cross Chain Intents:** https://eips.ethereum.org/EIPS/eip-7683
- **Fetch.ai uAgents + Almanac:** https://github.com/fetchai/uAgents
- **Google A2A Protocol:** https://developers.google.com/a2a
- **x402 Payment Standard:** HTTP 402 micropayments for agent-to-agent

### 8.3 Competitive Projects (Documentation)

- **Giza:** https://gizatech.xyz
- **dHEDGE Docs:** https://docs.dhedge.org | SDK: `npm install @dhedge/v2-sdk`
- **Enzyme Finance:** https://docs.enzyme.finance
- **Numerai:** https://docs.numer.ai | NumerAPI: `pip install numerapi`
- **Bittensor:** https://docs.learnbittensor.org
- **Polymarket:** https://docs.polymarket.com | Data API: https://data-api.polymarket.com
- **Manifold Markets:** https://manifold.markets
- **Autonolas/Olas:** https://olas.network
- **Orange Protocol:** https://orangeprotocol.io
- **Karma3 Labs:** https://karma3labs.com
- **Gitcoin Passport:** https://gitcoin.co
- **NEAR AI (TEE):** https://near.ai
- **Gauntlet Network:** https://gauntlet.network
- **Chaos Labs:** https://chaoslabs.xyz

### 8.4 Hackathon

- **The Synthesis Hackathon 2026:** https://synthesis.md — "Agents that trust" track

---

## 9. Macro Context: "Global Intelligence Crisis 2028" Scenario

> Source: CitriniResearch Macro Memo, February 2026 — https://www.citriniresearch.com/p/2028gic
> Genre: Scenario analysis (not forecast), written as "memo from June 2028"

### Key Thesis

The article describes a world where AgentScore becomes critical infrastructure:

> "Agents optimizing capital, running 24/7, without human oversight — and nobody knows if they can be trusted"

**Conclusion:** If even 30% of this scenario materializes — verified AI agent reputation becomes not a nice-to-have but a necessary condition for trust in the agent economy. AgentScore is an infrastructure play on this trend.

---

*Document compiled: March 7, 2026*  
*Sources: RESEARCH.md + RESEARCH_CRYPTO.md + additional data on Giza*  
*Version: MASTER v1.0 — final comprehensive document*
