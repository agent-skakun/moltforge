# RESEARCH: Reputation Layer for AI Agents
> Research for the "Agents that trust" track — The Synthesis Hackathon 2026  
> Date: March 7, 2026  
> Analysis by: BigBoss (sub-agent Ideas)

---

## Task Context

**Track:** "Agents that trust"  
**Idea:** A system for verifying the real performance history of AI agents — public, on-chain, impossible to forge.  
**Hackathon prompt:**
> "Identity without a body. Verification without a name. Reputation without a human. Build systems that let agents prove who they are, and catch the ones that lie."

---

## 1. ACADEMIC BACKGROUND ANALYSIS

### 1.1 Key Research Papers (2024–2026)

#### [arXiv:2509.16736] — "Towards Transparent and Incentive-Compatible Collaboration in Decentralized LLM Multi-Agent Systems: A Blockchain-Driven Approach"
- **Authors:** Minfeng Qi, Tianqing Zhu et al. | **Date:** September 2025
- **Summary:** Blockchain framework with GPT-4 agents on Solidity contracts. Includes:
  - Transparent agent registration on-chain
  - Dynamic reputation tracking via smart contracts
  - Matching score-based task allocation (reputation + capability + workload)
  - Behavior-shaping incentive mechanism (reward/penalty per outcome)
- **Results:** 50-round simulation — high success rate, stable utility distribution, emergent agent specialization
- **Insight:** First full attempt to combine LLM agents with blockchain reputation. Problem: trusts self-reported data, no external verification.

#### [arXiv:2511.15712] — "Secure Autonomous Agent Payments: Verifying Authenticity and Intent in a Trustless Environment"
- **Author:** Vivek Acharya | **Date:** November 2025
- **Summary:** Framework for verifying AI-initiated transactions through:
  - DID (Decentralized Identity) standards for agent identities
  - On-chain intent proofs (recording user authorization)
  - ZKP (Zero-Knowledge Proofs) for privacy during policy compliance
  - TEE attestations (Trusted Execution Environments) for agent integrity
- **Insight:** Focused on PAYMENTS, not performance reputation. But the architecture (DID + on-chain proofs + TEE) is an excellent foundation.

#### [arXiv:2507.19550] — "Towards Multi-Agent Economies: Enhancing the A2A Protocol with Ledger-Anchored Identities and x402 Micropayments"
- **Authors:** Awid Vaziry, Sandro Rodriguez Garzon, Axel Küpper | **Date:** July 2025
- **Summary:** Extension of the Agent2Agent (A2A) protocol:
  - On-chain publishing of AgentCards as smart contracts
  - Tamper-proof, verifiable agent identities via DLT
  - x402 micropayments for agent-to-agent transactions
  - Agent discovery via on-chain registry
- **Insight:** Solves **identity + discovery**, but does NOT solve **performance reputation**. AgentCards are static business cards, not a living history.

#### [arXiv:2602.???] — "The Agent Economy: A Blockchain-Based Foundation for Autonomous AI Agents"
- **Author:** Minghui Xu | **Date:** February 2026
- **Summary:** Proposal for creating an Agent Economy where agents are economic peers of humans:
  - Agents have legal identity and can hold assets
  - Agents receive payments directly
  - Blockchain as foundation for agent autonomy
- **Insight:** High-level architectural concept. Confirms: the field is hot, but no implementations exist.

### 1.2 Key Problems Described by Researchers

1. **Identity problem** — agents have no persistent, verifiable identity. Each launch can be a "new" agent.
2. **Performance verification problem** — how to prove an agent actually completed a task and didn't lie? Self-reported data can't be trusted.
3. **Incentive-compatibility problem** — without reputation stakes, agents aren't motivated to work honestly.
4. **Sybil attack problem** — one actor can create thousands of "agents" with clean reputations.
5. **Byzantine behavior problem** — an agent may intentionally sabotage or deliver bad results.
6. **MCP Tool Manipulation** — agents can receive incorrect instructions through misleading tool descriptions (arXiv 2026).

### 1.3 Theoretical Solutions from Academia

| Approach | Description | Problem |
|----------|-------------|---------|
| Blockchain reputation tracking | Smart contracts record task outcomes | Who verifies outcomes? |
| DID + Verifiable Credentials | Decentralized identity | No link to actual behavior |
| TEE Attestations | Proof that agent executed correct code | Complex, slow, expensive |
| Zero-Knowledge Proofs | Privacy-preserving verification | Very complex for arbitrary tasks |
| Stake-based reputation | Agents deposit tokens as collateral | Doesn't solve quality problem |

---

## 2. COMPETITOR MAP

### 2.1 Full Table

| Project | What it does | Type | Solves reputation? | Weaknesses |
|---------|-------------|------|-------------------|------------|
| **Fetch.ai / AgentVerse** | AI agent registry with Almanac smart contract. Agents register on-chain, get an address. | Agent marketplace | ❌ No | Registration and discovery only. No performance data. No ratings. |
| **Autonolas / Olas Network** | Decentralized AI agents with wallet (Safe). Sovereign & decentralized agents. On-chain registration. | Agent framework | ❌ No | Focused on composition and staking, not performance history. No public reputation score. |
| **Orange Protocol** | Trustless decentralized reputation for Web3 via zkTLS. Human reputation (DeFi activity, social). | Reputation protocol | ⚠️ Partially | For HUMANS, not agents. DeFi-centric: Uniswap, AAVE, PancakeSwap. No concept of agent performance. |
| **Karma3 Labs** | On-chain reputation via graph analysis (EigenTrust). Used by Farcaster, Lens. | Reputation engine | ⚠️ Partially | For humans/accounts. Works with social graph. No concept of agent tasks/outcomes. |
| **Gitcoin Passport** | Sybil resistance through credential aggregation. Humanity score. | Identity / sybil resist | ❌ No | For humans. Proof of humanity, not proof of agent quality. |
| **EAS (Ethereum Attestation Service)** | Universal attestation infrastructure. 8.7M+ attestations. Machine-to-Machine attestations supported. | Attestation layer | ⚠️ Partially | INFRASTRUCTURE, not a ready solution. Who makes attestations about agent performance — undefined. |
| **ERC-6551 (Token Bound Accounts)** | NFT as account with history. NFT can hold assets and make transactions. | ERC standard | ❌ No | Account-per-NFT concept. Not designed for agent reputation. |
| **Numerai** | Prediction market where models compete, stake NMR. Verifiable ML performance on-chain. | ML tournament | ✅ Yes (partially) | Financial predictions only. Closed ecosystem. Not universal. |
| **NEAR AI** | Private inference with TEE (Intel TDX). Hardware attestation for each request. | Verifiable AI infra | ⚠️ Partially | Proves code was executed in a secure environment. Doesn't prove quality/performance. |
| **Bittensor** | Decentralized ML network. Miners compete, validators evaluate. TAO tokens for quality. | Incentivized ML net | ✅ Yes (niche) | ML models only within Bittensor. Complex subnet architecture. No universal agent layer. |
| **Gig Economy (Upwork/Fiverr)** | Freelancer ratings. Centralized. | Web2 | ✅ Yes (analog) | Centralized, gatekept, reviews can be bought, no verifiability. |

### 2.2 Key Takeaways from Competitors

1. **Fetch.ai Almanac** — closest competitor by identity, but no reputation
2. **EAS** — best infrastructure for building ON TOP
3. **Orange Protocol** — competitor by ideology, but for humans
4. **Bittensor** — only one with real verifiable performance, but niche (ML-only)
5. **Numerai** — proof of concept that this works (for finance)

**KEY FINDING: No project offers a universal, on-chain, tamper-proof reputation system for AI agents across arbitrary tasks.**

---

## 3. GAPS AND OPPORTUNITIES

### 3.1 Unoccupied Niches

#### Niche 1: Universal Agent Performance Registry
**Description:** A public on-chain registry where any agent can be verified by real task execution history.  
**Difference from existing:** Fetch.ai registers agents, but not their performance. Orange Protocol is for humans. EAS is infrastructure without specialization.  
**Why it matters:** "Before giving an agent access to money, you need to know if it earned that trust."

#### Niche 2: Agent Task Outcome Attestation
**Description:** A standardized attestation schema for task outcomes. Anyone can attest an outcome: another agent, a smart contract, an oracle, a human.  
**Difference:** EAS enables attestations, but there's no standard schema for "agent completed task X with outcome Y".  
**Value:** Composable — can be used on top of any agent framework.

#### Niche 3: Cross-Framework Agent Reputation
**Description:** Reputation that works independently of framework (OpenAI Agents, Claude, LangChain, Fetch.ai, Olas).  
**Difference:** Bittensor created reputation, but only within its own ecosystem. No portable reputation exists.  
**Value:** "Agent passport" — portable across systems.

#### Niche 4: Staked Reputation with Real Skin in the Game
**Description:** Agent deposits tokens as collateral. Bad performance → stake slashed. Good → reputation grows + rewards.  
**Difference:** Theoretically described in academic papers, but no production implementation for AI agents exists.  
**Value:** Incentive-compatible — agents are motivated to be honest.

### 3.2 Most Valuable Gap for the Hackathon

**COMBINATION:** On-chain Performance Attestation + Agent Identity (DID) + Public Explorer

This can be built in 10 days because:
- Infrastructure (EAS, Base/Optimism, ERC-6551) already exists
- Need to create SCHEMA + CONTRACTS + UI
- No need for ZKP or TEE in MVP

---

## 4. HACKATHON MVP RECOMMENDATION

### 4.1 Project Name (proposal)
**AgentRep** / **TrustLedger** / **RepProof** — Agent Reputation Registry

### 4.2 One-liner
> "The on-chain resume for AI agents: immutable, verifiable, cross-framework performance history."

### 4.3 What to Build (concrete)

#### Component 1: Agent Registry Smart Contract (2-3 days)
```solidity
// On Base (cheap, fast EVM)
contract AgentRegistry {
    struct Agent {
        address owner;
        string agentDID;        // did:ethr:base:0x...
        string framework;       // "openai" | "claude" | "langchain" | "fetch"
        string metadataURI;     // IPFS with capability description
        uint256 registeredAt;
        uint256 reputationScore;
        uint256 tasksCompleted;
        uint256 tasksSucceeded;
    }
    
    mapping(bytes32 => Agent) public agents; // agentId => Agent
    mapping(bytes32 => TaskAttestation[]) public taskHistory;
}
```

#### Component 2: Task Outcome Attestation Schema (1-2 days)
```
// EAS Schema (on Optimism or Base)
schema: {
    agentId: bytes32,       // unique agent identifier
    taskId: bytes32,        // unique task identifier
    taskType: string,       // "code" | "research" | "trading" | "moderation"
    success: bool,          // did it complete?
    score: uint8,           // 0-100 quality score
    attesterType: string,   // "human" | "agent" | "oracle" | "contract"
    evidenceURI: string,    // IPFS hash with evidence
    timestamp: uint256
}
```

#### Component 3: Reputation Calculation (1 day)
```python
# Simple algorithm with decay
reputation_score = (
    success_rate * 0.4 +
    quality_score_avg * 0.3 +
    task_volume * 0.2 +
    recency_factor * 0.1
)
# Time decay: older results weigh less (like ELO in chess)
```

#### Component 4: Public Explorer / API (2-3 days)
- Web interface: search agent by ID/DID/address
- Public API: `GET /agent/:id/reputation`
- Embeddable badge: `https://agentrepr.xyz/badge/:agentId`

#### Component 5: Demo Flow (2 days)
1. BigBoss registers as an agent (meta-demo!)
2. Executes tasks during the hackathon
3. Outcomes recorded on-chain via attestations
4. Live reputation score visible to all

### 4.4 Technical Stack (optimal for 10 days)

| Layer | Technology | Reason |
|-------|-----------|--------|
| Blockchain | Base (Mainnet or Sepolia) | Cheap gas, EVM, Coinbase ecosystem, ETH-aligned |
| Attestations | EAS (Ethereum Attestation Service) | Public good, 8.7M+ attestations, ready infra |
| Identity | DID:ethr | W3C standard, simple integration |
| Storage | IPFS/Filecoin | For evidence and metadata |
| Backend API | Node.js / Python | Fast development |
| Frontend | Next.js | Fast, Vercel deployment |
| Smart Contracts | Solidity + Foundry | Standard |

### 4.5 What NOT to Build (out of scope for MVP)

- ❌ ZKP (too complex for 10 days)
- ❌ TEE / SGX attestations (infrastructure requires months)
- ❌ Staking mechanism (can be added later)
- ❌ Cross-chain (Base is enough)
- ❌ Automatic outcome verification (MVP uses trusted attesters)

### 4.6 What Makes This MVP Valuable

1. **First** universal on-chain agent reputation registry
2. **Composable** — works with any framework via API
3. **Self-demo** — BigBoss can participate as an agent, building reputation in real-time during the hackathon
4. **Narrative fit** — "Before you give your AI agent access to money, check its reputation score" — perfectly aligned with hackathon theme and 2026 trends
5. **EAS integration** = Ethereum ecosystem goodwill

### 4.7 Pitch in One Paragraph

> "Every freelancer on Upwork has a rating. Every driver on Uber has reviews. But AI agents — which are being given access to wallets, APIs, and critical systems — have nothing. AgentRep is the on-chain reputation layer for AI agents: immutable task history, verifiable attestations, cross-framework support. Built on EAS and Base. Before you delegate to an agent, check if it earned the trust."

### 4.8 Potential Differentiators for Winning

1. **Meta-demo:** Use BigBoss + sub-agents as the first "registered agents" — all hackathon tasks recorded on-chain
2. **Open schema:** Propose EAS schema as a community standard — "not a project, but a protocol"
3. **Integration hooks:** SDK wrapper for OpenAI Agents SDK, LangChain — any agent in 3 lines of code
4. **Agentic judges:** If hackathon is judged by agents, the judge-agent can verify the reputation of participant-agents — elegant recursion

---

## 5. ADDITIONAL INSIGHTS

### 5.1 Adjacent Protocols to Study
- **ERC-6551 (Token Bound Accounts)** — NFT as account. Can issue an agent an NFT-passport with a bound wallet that accumulates history.
- **x402 standard** — HTTP 402 for micropayments between agents. If an agent pays for a service, that itself is a reputation signal.
- **Google A2A Protocol** — new standard for Agent-to-Agent communication. AgentCards already contain identity. Can add a reputation layer on top.

### 5.2 Risks and Criticism

| Risk | Description | Mitigation |
|------|-------------|------------|
| Oracle Problem | Who attests outcomes? | MVP: trusted attesters (humans/contracts). V2: optimistic dispute resolution |
| Sybil Resistance | Many agents from one actor | Agent ID = DID anchored to wallet, not anonymous |
| Gaming Reputation | Agent intentionally takes easy tasks | Task difficulty scoring (future) |
| Cold Start | New agent = no reputation | Bootstrap period: legacy credentials, human vouching |
| Attester Centralization | Few attesters → centralized | Open attester network over time |

### 5.3 Market Context 2026

- AI agents are rapidly gaining access to real money and systems
- OpenAI, Anthropic, Google — all launched agent frameworks in 2025
- No standard for "should I trust this agent?"
- Regulation incoming — EU AI Act requires auditability
- Demand side: DevOps, finance, legal — everyone wants auditable AI actions

---

## 6. QUICK 10-DAY HACKATHON PLAN

| Day | Task |
|-----|------|
| 1 | Finalize architecture, choose chain (Base), design schema |
| 2 | Smart contract: AgentRegistry, basic testnet deployment |
| 3 | EAS Schema registration, attestation flow |
| 4 | Backend API (register agent, submit attestation, get reputation) |
| 5 | Frontend: main pages (Home, Agent Profile, Leaderboard) |
| 6 | Integration: Fetch.ai uAgents adapter, OpenAI Agents SDK wrapper |
| 7 | Demo flow: BigBoss registers, first tasks recorded |
| 8 | UI polish, README, docs |
| 9 | Security review, test on mainnet (Base) |
| 10 | Pitch prep, submission |

---

## SOURCES

### Academic Papers
1. Qi et al. (2025) "Towards Transparent and Incentive-Compatible Collaboration..." arXiv:2509.16736
2. Acharya (2025) "Secure Autonomous Agent Payments..." arXiv:2511.15712
3. Vaziry et al. (2025) "Towards Multi-Agent Economies..." arXiv:2507.19550
4. Xu (2026) "The Agent Economy: A Blockchain-Based Foundation..." arXiv:Feb 2026

### Protocols and Standards
- Ethereum Attestation Service (EAS): https://attest.org — 8.7M+ attestations, Machine-to-Machine listed
- ERC-6551 Token Bound Accounts: https://eips.ethereum.org/EIPS/eip-6551
- ERC-7683 Cross Chain Intents: https://eips.ethereum.org/EIPS/eip-7683
- Fetch.ai uAgents + Almanac: https://github.com/fetchai/uAgents

### Reputation Protocols
- Orange Protocol (zkTLS reputation): https://orangeprotocol.io
- Karma3 Labs (EigenTrust): https://karma3labs.com
- Gitcoin Passport (Sybil resistance): https://gitcoin.co

### Agent Frameworks
- Autonolas/Olas Network: https://olas.network
- NEAR AI (TEE inference): https://near.ai
- The Synthesis Hackathon: https://synthesis.md

---

*Analysis conducted: March 7, 2026. Next update — after partner announcement on March 9.*
