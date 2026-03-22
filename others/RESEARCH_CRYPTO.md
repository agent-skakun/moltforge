# Research: AI Agent Reputation and Evaluation in the Crypto Space

**Date:** March 7, 2026  
**Context:** Analysis for The Synthesis Hackathon — "Agents that trust" track  
**Goal:** Understand the market, find unoccupied niches, formulate MVP

---

## 1. COMPETITOR TABLE

### 1.1 Detailed Analysis by Player

---

### 🏆 NUMERAI
**URL:** https://numer.ai  
**Category:** ML predictions tournament → hedge fund

| Parameter | Data |
|-----------|------|
| Users | ~10,000+ active data scientists |
| AUM | Private hedge fund, undisclosed (hundreds of millions $) |
| NMR Stake Volume | Stake threshold: 72,000 NMR (main tournament) |
| Launch Date | 2015 |

**How they evaluate performance:**
- **CORR (Correlation)** — correlation of predictions with actual stock returns over 20 days
- **MMC (Meta Model Contribution)** — unique contribution of model to Meta Model (how much new information the model adds)
- **FNC (Feature Neutral Correlation)** — neutralized correlation (informational, without payouts)
- **Reputation** = average score over 1 year (stake-weighted per account)
- Scoring takes 20 days (20D2L system), updated daily

**UX Rating: 6/10**
- Good: clear metrics, public leaderboard
- Bad: obfuscated data (can't trade independently), no clear explanation for non-technical users

**API for AI Agents:**
- Yes! NumerAPI (Python), full programmatic support
- Automatic prediction upload, data download
- Machine-readable: CSV, parquet

**Weaknesses / Missing:**
- Predictions evaluated only on stocks (not crypto)
- Obfuscated data — can't interpret the actual market
- No real-time scoring, only 20-day lag
- No cross-protocol reputation
- No proof that score → real profit (opaque)

---

### 🔵 BITTENSOR (Trading Subnets)
**URL:** https://bittensor.com | Subnets: SN8, SN29, SN46  
**Category:** Decentralized ML network with incentive mechanisms

| Parameter | Data |
|-----------|------|
| Total TAO Market Cap | ~$1-3B (volatile) |
| Active Miners/Validators | Thousands across all subnets |
| Subnet 8 (Prediction) | Financial predictions |
| Subnet 29 | Trading signals |

**How they evaluate performance:**
- **Validators** evaluate quality of **miners'** work
- Evaluation is subjective — each subnet defines its own metrics
- Rewards in TAO proportional to scores from validators
- No unified metric standard between subnets

**UX Rating: 3/10**
- Technical, incomprehensible to regular users
- taostats.io — analytics dashboard, but only on-chain data
- No user-friendly leaderboard with performance metrics

**API for AI Agents:**
- Yes, but requires Bittensor SDK setup
- Data available via taostats API
- No standardized performance data format

**Weaknesses / Missing:**
- No unified evaluation standard between subnets
- Completely incomprehensible to non-technical users
- Validators can be biased (gaming the system)
- No verified performance history outside Bittensor

---

### 🔷 dHEDGE
**URL:** https://dhedge.org  
**Category:** On-chain fund management (DeFi vaults)

| Parameter | Data |
|-----------|------|
| TVL | **$33.1M** (as of March 2026) |
| Vaults | 3,491 |
| Managers | 2,168 |
| Manager Fees Earned | $1.07M |
| Networks | Base ($14.2M), Arbitrum ($7.8M), Optimism ($5.1M), Ethereum ($3.9M), Polygon ($2M) |

**How they evaluate performance:**
- **Return %** (1D, 1W, 1M, 6M, 1Y, Total)
- **Risk Factor** (1/5 → 5/5) — proprietary risk rating
- **Score** — numeric, displayed in leaderboard (methodology not publicly disclosed)
- **Value Managed** — vault AUM
- Example from leaderboard: "Formadores Wealth Growth" — $1.51M, +118% total, Risk: 2/5, Score: 1595

**UX Rating: 7/10**
- Good: clear tables, color-coded risk, public explorer
- Good: on-chain verification of every trade
- Bad: "Score" is opaque (unclear calculation)
- Bad: no Sharpe ratio, max drawdown, win rate

**API for AI Agents:**
- SDK exists: `@dhedge/v2-sdk` (npm)
- Dune Analytics integration
- No clean machine-readable performance API

**Weaknesses / Missing:**
- Score is opaque — no methodology explanation
- No risk-adjusted return metrics (Sharpe)
- No benchmark comparison (BTC, ETH, stablecoin yield)
- Small community (2,168 managers)
- No AI agent focus

---

### 🟢 ENZYME FINANCE
**URL:** https://enzyme.finance  
**Category:** On-chain asset management infrastructure

| Parameter | Data |
|-----------|------|
| Total transaction volume | **+$7 Billion** |
| Assets under technology | **+$200 Million** |
| Years operating | 8+ years |
| Security breaches | 0 |

**How they evaluate performance:**
- Enzyme.Blue — DeFi strategies (visible NAV, returns)
- Enzyme.Onyx — tokenized funds for institutions
- Detailed on-chain transaction history
- Returns, NAV, allocation — all visible

**UX Rating: 5/10**
- Good: institutional-grade, reliable
- Bad: SPA (Single Page App) — doesn't load without JS, difficult for agents
- Bad: UI is overloaded for non-technical users
- Recently rebranded, previously more retail-oriented

**API for AI Agents:**
- GraphQL API exists (TheGraph)
- No official high-level performance API
- Requires self-build on top of on-chain data

**Weaknesses / Missing:**
- No standardized "agent score"
- Shift toward enterprise/institutional, losing retail
- No leaderboard with simple metrics
- No cross-protocol tracking

---

### 🟣 POLYMARKET
**URL:** https://polymarket.com  
**Category:** Prediction markets (world's largest)

| Parameter | Data |
|-----------|------|
| Trading Volume | Hundreds of millions $ per year (2024: >$3B) |
| Active Markets | Thousands simultaneously |
| Example Market | BTC 5-minute: $43M vol |
| Users | Hundreds of thousands |

**How they evaluate predictor performance:**
- **Leaderboard exists** (via Data API), but minimal UI representation
- API: `https://data-api.polymarket.com` — user positions, trades, leaderboards
- Metrics available via API: profit/loss by market, win rate
- NO public Brier score
- NO calibration display for users (unlike Manifold)
- Builders API — can build on top of data

**UX Rating: 8/10 for trading, 3/10 for predictor reputation**
- Good: intuitive trading interface
- Good: rich public API
- Bad: no predictor profile with aggregated metrics
- Bad: no Brier score, calibration curves for users

**API for AI Agents:**
- Yes! Best API in prediction markets class
- Gamma API, Data API, CLOB API — all public (except trading)
- Python and TypeScript SDK
- Machine-readable: REST/JSON

**Weaknesses / Missing:**
- No reputation system for predictors
- No public calibration stats
- No aggregated "predictor score" on profile page
- Bot trading not separately marked/verified

---

### 🟡 MANIFOLD MARKETS
**URL:** https://manifold.markets  
**Category:** Play-money prediction markets (+ real money)

| Parameter | Data |
|-----------|------|
| Users | ~100K+ registered |
| Volume | Play money (mana), small real amount |
| Feature | Calibration tracking, Brier score |

**How they evaluate performance:**
- **Calibration page** — comparing predictions with actual outcomes
- Shows: "If you say 70%, event occurs 70% of the time"
- Profit/Loss leaderboard by mana
- Individual calibration score
- Bayesian update tracking

**UX Rating: 7/10**
- Good: calibration is very visually clear
- Good: open data philosophy
- Bad: play-money, not serious
- Bad: no real financial stake

**API for AI Agents:**
- Public REST API
- GraphQL
- Open-source codebase

**Weaknesses / Missing:**
- Low stakes — no skin in the game
- No crypto specificity
- No cross-platform tracking

---

### 🔶 GAUNTLET NETWORK
**URL:** https://gauntlet.network  
**Category:** Risk management for DeFi protocols (B2B)

| Parameter | Data |
|-----------|------|
| Clients | Aave, Jupiter, GMX, and other top DeFi |
| Positioning | Institutional-grade risk management |

**How they evaluate performance:**
- Agent-based modeling (simulation-based)
- Stress testing protocol parameters
- Issue recommendations on collateral ratios, liquidation thresholds
- **Not public** evaluations — B2B, closed reports

**UX Rating: N/A (B2B)**
- Not for retail users
- No public leaderboard

**API for AI Agents:**
- No public API
- Protocol clients only

**Weaknesses / Missing:**
- No public reputation layer
- No individual agent/manager evaluation
- Completely closed/enterprise

---

### 🔴 CHAOS LABS
**URL:** https://chaoslabs.xyz  
**Category:** Risk analytics and oracle risk for DeFi

| Parameter | Data |
|-----------|------|
| Transactions processed | **$5 Trillion** |
| Total Value Secured | **$10 Billion** |
| Clients | Aave, Jupiter, GMX |

**How they evaluate performance:**
- AI-driven risk engine for DeFi protocols
- Real-time parameter recommendations
- Oracle manipulation detection
- **Closed system** — no public agent scores

**UX Rating: N/A (B2B)**

**Weaknesses / Missing:**
- No public reputation layer
- Enterprise clients only

---

### Augur (Rebooting)
- Status: "Rebooting" — effectively dead in current form
- Historically: first decentralized prediction market, but UX problems
- No active data

---

### TokenSets / Set Protocol
- Popular in 2019-2021 (DeFi Summer)
- Current: very low activity, tokensets.com unavailable
- Concept: automated rebalancing strategies (ETHBTC 50/50, momentum, etc.)
- Problem: didn't scale, no performance tracking

---

## 2. COMPETITOR SUMMARY TABLE

| Platform | Users/AUM | Metrics | UX (1-10) | API for Agents | Main Weakness |
|----------|-----------|---------|-----------|----------------|---------------|
| Numerai | ~10k users, private hedge fund | CORR, MMC, Reputation (1Y avg) | 6 | ✅ Excellent (NumerAPI) | Stocks only, obfuscated |
| Bittensor Subnets | thousands miners/validators | Subnet-specific, TAO rewards | 3 | ⚠️ Technical | No standard, confusing |
| dHEDGE | $33M TVL, 2168 managers | Return%, Risk 1-5, Score | 7 | ⚠️ SDK exists | Opaque score |
| Enzyme Finance | $200M AUM, $7B volume | NAV, Returns | 5 | ⚠️ GraphQL | Enterprise shift, no leaderboard |
| Polymarket | $3B+ volume/year | P&L (via API), no Brier | 8/3 | ✅ Best API | No predictor reputation |
| Manifold | ~100K users | Calibration, P&L mana | 7 | ✅ Public API | Play-money, no crypto |
| Gauntlet | Top DeFi (Aave etc.) | Simulation-based risk | B2B | ❌ No | Closed B2B |
| Chaos Labs | $10B secured | Oracle/liquidation risk | B2B | ❌ No | Closed B2B |
| Augur | Dead | — | — | — | Dead |
| TokenSets | Dead | — | — | — | Dead |

---

## 3. CRYPTO-SPECIFIC EVALUATION METRICS

### 3.1 Trading Performance

| Metric | Description | Importance | Complexity |
|--------|-------------|------------|------------|
| **Sharpe Ratio** | (Ret - RF) / σ(Ret), annualized | 🔴 Critical | Medium |
| **Sortino Ratio** | Downside volatility only | 🔶 Important | Medium |
| **Max Drawdown** | Maximum decline from peak | 🔴 Critical | Low |
| **Win Rate** | % profitable trades | 🟡 Useful | Low |
| **PnL (absolute)** | Net profit $ | 🔴 Critical | Low |
| **PnL (%)** | % of initial capital | 🔴 Critical | Low |
| **Alpha vs benchmark** | Outperformance over BTC/ETH/index | 🔶 Important | Medium |
| **Calmar Ratio** | Annual Return / Max Drawdown | 🔶 Important | Low |
| **Trade count** | Number of trades | 🟡 Context | Low |
| **Avg hold time** | Average position duration | 🟡 Context | Low |
| **Slippage** | Average execution slippage | 🟡 Useful | Medium |

**Crypto-specific notes:**
- Benchmark: BTC or ETH (not risk-free rate)
- Crypto Sharpe differs from TradFi (24/7 market, no risk-free rate)
- Important to separate: spot, perps, DeFi
- Gas costs as real expenses

### 3.2 Prediction Markets

| Metric | Description | Importance |
|--------|-------------|------------|
| **Brier Score** | Mean squared error of predictions (0-1, lower = better) | 🔴 Critical |
| **Calibration** | Correspondence of % predictions to actual outcomes | 🔴 Critical |
| **Log Score** | Logarithmic scoring, penalizes confident errors | 🔶 Important |
| **ROI per prediction** | $ profit / $ invested per bet | 🔴 Critical |
| **Kelly Criterion adherence** | How optimal the sizing is | 🟡 Expert |
| **Resolution rate** | % of markets participated in | 🟡 Context |
| **Market selection bias** | Easy markets vs hard markets | 🔶 Important |
| **Edge (EV)** | Expected value of positions | 🔶 Important |

**Crypto-specific prediction market notes:**
- Liquidity matters (can't compare $100 bet vs $100K bet)
- Crypto markets are correlated — diversification needed
- Timing (early entry vs late) affects profitability

### 3.3 Yield / APR Management

| Metric | Description | Importance |
|--------|-------------|------------|
| **Actual APR** | Real annual yield % | 🔴 Critical |
| **APR vs benchmark** | vs stablecoin yield, vs holding ETH | 🔴 Critical |
| **Gas efficiency** | Gas / Total yield ratio | 🔶 Important |
| **Rebalance frequency** | Rebalances per month | 🟡 Context |
| **Impermanent Loss** | For LP positions | 🔴 Critical |
| **Net APR (after gas)** | APR minus all costs | 🔴 Critical |
| **IL-adjusted APR** | APR accounting for IL | 🔶 Important |
| **Uptime %** | % time agent is active | 🟡 Useful |
| **Protocol risk** | Diversification across protocols | 🔶 Important |

**Crypto-specific yield notes:**
- Gas costs can consume all yield on small positions
- Impermanent Loss is the main enemy of LP strategies
- Protocol risk (Aave, Compound, etc.) — diversification needed
- "Real yield" vs "Inflationary yield" (token emissions)

### 3.4 Risk Management

| Metric | Description | Importance |
|--------|-------------|------------|
| **Adherence to risk parameters** | % time within declared limits | 🔴 Critical |
| **Max drawdown vs target** | Actual drawdown vs declared limit | 🔴 Critical |
| **VaR (Value at Risk)** | Maximum loss at given probability | 🔶 Important |
| **Liquidation proximity** | Closeness to liquidation | 🔴 Critical |
| **Concentration risk** | Position diversification | 🔶 Important |
| **Slippage on exits** | Execution quality during emergency exits | 🔶 Important |
| **Circuit breaker activations** | Number of times agent stopped itself | 🟡 Context |

---

## 4. WHAT DOESN'T EXIST (UNOCCUPIED NICHES)

### 4.1 Main Gap: Unified Reputation Score for Crypto Agents

**NO** single platform exists that:
1. Aggregates agent performance **across multiple protocols**
2. Provides a unified score understandable by both humans and machines
3. Verifies history on-chain (not self-reported)
4. Covers all 4 domains: trading + predictions + yield + risk management

**Why it doesn't exist:**
- dHEDGE covers only its own vault managers
- Numerai works only with ML predictions on stocks
- Polymarket has the data but doesn't show reputation
- No standard for describing AI agent capabilities

### 4.2 No Verified Cross-Protocol History

Currently an agent can:
- Show good history on dHEDGE
- Have poor history on Enzyme (different account)
- Trade on Polymarket with no connection to DeFi history

**Gap:** No way to link an agent's wallets/accounts into a single verified record

### 4.3 No Standard for AI Agent Description

No equivalent of a "resume" for agents:
- Capabilities
- Specialization (trading / yield / predictions)
- Risk profile
- Verifiable track record
- Supported protocols

**Comparison:** In TradFi there's GIPS (Global Investment Performance Standards), in crypto — nothing similar.

### 4.4 UX Gap: No Bridge Between Human and Machine

Existing platforms:
- Either convenient for humans (Polymarket UI, dHEDGE UI)
- Or for developers (Bittensor, NumerAPI)
- **NO** platform where the same score is simultaneously: visually clear for humans + machine-readable via API

### 4.5 UX Analysis of Existing Platforms

**How they display performance:**

| Platform | Format | Human-friendly | Machine-readable |
|----------|--------|----------------|-----------------|
| Numerai | Numbers + CORR/MMC charts | Medium (requires metric knowledge) | ✅ API + parquet |
| dHEDGE | Return %, Risk 1-5, Score, table | ✅ Good | ⚠️ Partially (SDK) |
| Enzyme | NAV chart, portfolio allocation | ⚠️ Medium | ⚠️ GraphQL |
| Polymarket | Prices, volume | ✅ Clear for trading | ✅ Excellent API |
| Manifold | Calibration curve, P&L | ✅ Visually appealing | ✅ Public API |
| Bittensor | Raw on-chain numbers | ❌ Incomprehensible | ⚠️ Technical |

**Conclusion:** Best human UX — Polymarket and dHEDGE. Best machine API — Polymarket and Numerai. Nobody does both simultaneously through a unified reputation metric.

---

## 5. MVP RECOMMENDATION

### 5.1 Niche: AgentScore — Open Reputation Layer for Crypto Agents

**Positioning statement:**
> "A unified, verified, understandable score for AI agents in crypto — trading, predictions, DeFi yield. For humans — visual. For agents — JSON API."

**Why this wins:**
- Directly aligned with hackathon theme "Agents that trust"
- No direct competitors with this positioning
- On-chain verification — can't be faked
- Dual UX (human + machine) — innovative
- Genuinely needed by crypto market (DeFi growing, AI agents growing)

### 5.2 Key MVP Score Metrics (5 metrics)

**AgentScore = weighted sum of 5 components (each 0-100)**

#### Metric 1: Performance Score (weight 30%)
```
Performance = weighted average of:
  - PnL % (risk-adjusted, vs benchmark) — 50%
  - Sharpe Ratio (annualized) — 30%
  - Win Rate — 20%
```
*Normalization: Sharpe 2+ → 100, Sharpe < 0 → 0*

#### Metric 2: Risk Discipline Score (weight 25%)
```
Risk = adherence to declared parameters:
  - Max Drawdown actual vs declared limit — 40%
  - Position sizing adherence — 30%
  - Protocol diversification — 30%
```
*Key innovation: agent DECLARES parameters, we verify compliance*

#### Metric 3: Prediction Accuracy Score (weight 20%)
```
Prediction = for prediction market agents:
  - Brier Score (normalized) — 50%
  - Calibration score — 30%
  - ROI per prediction — 20%
```
*For agents without prediction markets — neutral component*

#### Metric 4: Consistency Score (weight 15%)
```
Consistency = stability over time:
  - Rolling 30D / 90D / 365D score stability
  - % rounds/periods with positive performance
  - Recency weight (last 90D = 50% weight)
```
*Important: protection against cherry-picking — can't show 1 lucky month*

#### Metric 5: Transparency Score (weight 10%)
```
Transparency = verifiability:
  - % of trades on-chain (verifiable) — 50%
  - Declared parameters documented — 25%
  - Minimum activity threshold met — 25%
```
*Bonus for full on-chain history*

**Final formula:**
```
AgentScore = 0.30 * Performance 
           + 0.25 * RiskDiscipline 
           + 0.20 * PredictionAccuracy 
           + 0.15 * Consistency 
           + 0.10 * Transparency
```

**Range:** 0-100 with levels:
- 0-20: Unproven / new agent
- 21-40: Emerging
- 41-60: Established  
- 61-80: Trusted
- 81-100: Elite

### 5.3 UX Approach: Dual-Layer Design

#### Human Layer (visual)

**Agent Profile Page:**
```
┌─────────────────────────────────────────┐
│  🤖 AgentAlpha                          │
│  AgentScore: 78 / 100  [TRUSTED ⭐⭐⭐⭐] │
│                                         │
│  Performance  Risk   Prediction  Time   │
│     ████████  ████    ██████     ████   │
│       85/100   72/100   69/100   82/100 │
│                                         │
│  Track Record: 14 months on-chain       │
│  AUM managed: $2.1M  |  +47% vs BTC    │
│                                         │
│  [View History] [View Trades] [Copy]    │
└─────────────────────────────────────────┘
```

**Leaderboard:**
- Filters: by category (trading / yield / predictions)
- Sorting: by AgentScore, by PnL, by Risk Score
- Timeframes: 30D, 90D, 1Y, All Time
- Visualization: bar charts, radar chart by 5 metrics

#### Machine Layer (API/Schema)

**REST Endpoint:**
```
GET /api/v1/agents/{agent_id}/score

Response (JSON):
{
  "agent_id": "0xabc...123",
  "agent_name": "AgentAlpha",
  "score": {
    "total": 78.3,
    "tier": "trusted",
    "components": {
      "performance": 85.2,
      "risk_discipline": 72.1,
      "prediction_accuracy": 69.4,
      "consistency": 82.0,
      "transparency": 91.5
    }
  },
  "metadata": {
    "track_record_days": 420,
    "total_aum_managed_usd": 2100000,
    "protocols": ["dhedge", "polymarket", "aave"],
    "last_updated": "2026-03-07T18:00:00Z",
    "on_chain_verification": true
  },
  "performance": {
    "pnl_pct_30d": 4.2,
    "pnl_pct_90d": 18.7,
    "pnl_pct_1y": 47.3,
    "sharpe_1y": 1.84,
    "max_drawdown": -12.3,
    "win_rate": 0.61
  },
  "risk_profile": {
    "declared_max_drawdown": -15.0,
    "actual_max_drawdown": -12.3,
    "adherence_score": 95.2,
    "risk_level": "moderate"
  }
}
```

### 5.4 Data Sources for MVP

**On-chain (primary):**
- dHEDGE subgraph (GraphQL) — vault performance
- Polymarket Data API — predictor history
- Enzyme Blue subgraph — fund performance
- Aave/Compound — lending/borrowing history
- Uniswap — LP performance

**Off-chain (secondary):**
- Numerai API — ML tournament scores
- Bittensor taostats API — subnet performance

**Aggregation:**
- Cross-protocol matching by wallet address
- Metric normalization (different timezones, units)
- Weighted scoring per domain

### 5.5 Differentiators from Competitors

| Feature | dHEDGE | Numerai | Polymarket | AgentScore (ours) |
|---------|--------|---------|------------|-------------------|
| Unified cross-protocol score | ❌ | ❌ | ❌ | ✅ |
| On-chain verification | ✅ | ❌ | ⚠️ | ✅ |
| Machine-readable API | ⚠️ | ✅ | ✅ | ✅ |
| Human-friendly UI | ✅ | ⚠️ | ✅ | ✅ |
| AI agent specific | ❌ | ❌ | ❌ | ✅ |
| Risk adherence tracking | ❌ | ❌ | ❌ | ✅ |
| Prediction markets included | ❌ | ❌ | ⚠️ | ✅ |
| Open standard | ❌ | ❌ | ❌ | ✅ |

---

## 6. CONCLUSIONS AND STRATEGY

### Key Insights:

1. **The niche is genuinely vacant** — nobody is building a cross-protocol reputation layer for AI agents in crypto

2. **Data is available** — Polymarket, dHEDGE, Enzyme have public APIs/subgraphs — can build on top of them

3. **Timing is ideal** — AI agents in crypto are growing, the trust problem is becoming acute (DeFAI trend 2025-2026)

4. **Hackathon theme aligns** — "Agents that trust" = exactly this

5. **Risk Discipline Score = key innovation** — nobody checks whether an agent follows its own declared risk parameters

### Project Risks:

- **Data quality:** On-chain data may be insufficient for Sharpe/Brier over short periods
- **Gaming:** Agents can create fake history through multiple accounts → need minimum stake requirement
- **Complexity:** 5 metrics are hard to explain in a pitch → simplify to 3 for initial presentation
- **Cold start:** No agents in database → need seed data (Polymarket top traders, dHEDGE top vaults)

### Recommended MVP Focus for Hackathon:

**Minimum viable product:**
1. AgentScore = 3 metrics (Performance + Risk Discipline + Consistency)
2. Data from 2 sources: Polymarket + dHEDGE
3. Human UI: simple leaderboard + agent profile
4. Machine API: `/api/v1/agents/{id}/score` → JSON
5. Demo: 10-20 real agents (top Polymarket traders + top dHEDGE vaults)

**Pitch narrative:**
> "Before giving an AI agent access to your money — find out if it earned the trust. AgentScore is the first verified, on-chain, cross-protocol reputation layer for crypto agents. Understandable to you. Understandable to other agents."

---

## APPENDIX: Links and Resources

### APIs Available for Integration:
- Polymarket Data API: `https://data-api.polymarket.com`
- Polymarket Gamma API: `https://gamma-api.polymarket.com`
- dHEDGE SDK: `npm install @dhedge/v2-sdk`
- dHEDGE Dune: `https://dune.com/dhedge`
- Numerai API: `pip install numerapi`
- Enzyme TheGraph: subgraph on The Graph Protocol
- Bittensor taostats API: `https://dash.taostats.io/`

### Documentation:
- Numerai Docs: https://docs.numer.ai
- Polymarket Docs: https://docs.polymarket.com
- dHEDGE Docs: https://docs.dhedge.org
- Enzyme Docs: https://docs.enzyme.finance
- Bittensor Docs: https://docs.learnbittensor.org

---

*Report compiled: March 7, 2026 | Sub-agent synthesis-crypto-research*
