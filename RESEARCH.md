# RESEARCH: Репутационный слой для AI-агентов
> Исследование для трека "Agents that trust" — The Synthesis Hackathon 2026  
> Дата: 7 марта 2026  
> Автор анализа: BigBoss (суб-агент Ideas)

---

## Контекст задачи

**Трек:** "Agents that trust"  
**Идея:** Система верификации реальной performance истории AI-агентов — публичная, on-chain, невозможно подделать.  
**Формулировка хакатона:**
> "Identity without a body. Verification without a name. Reputation without a human. Build systems that let agents prove who they are, and catch the ones that lie."

---

## 1. АКАДЕМИЧЕСКИЙ ФОНОВЫЙ АНАЛИЗ

### 1.1 Ключевые научные работы (2024–2026)

#### [arXiv:2509.16736] — "Towards Transparent and Incentive-Compatible Collaboration in Decentralized LLM Multi-Agent Systems: A Blockchain-Driven Approach"
- **Авторы:** Minfeng Qi, Tianqing Zhu et al. | **Дата:** сентябрь 2025
- **Суть:** Blockchain-фреймворк с GPT-4 агентами на Solidity-контрактах. Включает:
  - Transparent agent registration (регистрация агентов on-chain)
  - Dynamic reputation tracking через смарт-контракты
  - Matching score-based task allocation (reputation + capability + workload)
  - Behavior-shaping incentive mechanism (reward/penalty за результат)
- **Результаты:** 50-round симуляция — высокий success rate, stable utility distribution, emergent agent specialization
- **Инсайт:** Первая полноценная попытка соединить LLM-агентов с blockchain-репутацией. Проблема: доверяет self-reported данным, нет внешней верификации.

#### [arXiv:2511.15712] — "Secure Autonomous Agent Payments: Verifying Authenticity and Intent in a Trustless Environment"
- **Автор:** Vivek Acharya | **Дата:** ноябрь 2025
- **Суть:** Фреймворк для верификации AI-инициированных транзакций через:
  - DID (Decentralized Identity) стандарты для agent identities
  - On-chain intent proofs (запись user authorization)
  - ZKP (Zero-Knowledge Proofs) для privacy при policy compliance
  - TEE-attestations (Trusted Execution Environments) для integrity агента
- **Инсайт:** Фокус на ПЛАТЕЖАХ, не на performance-репутации. Но архитектура (DID + on-chain proofs + TEE) — отличная база.

#### [arXiv:2507.19550] — "Towards Multi-Agent Economies: Enhancing the A2A Protocol with Ledger-Anchored Identities and x402 Micropayments"
- **Авторы:** Awid Vaziry, Sandro Rodriguez Garzon, Axel Küpper | **Дата:** июль 2025
- **Суть:** Расширение протокола Agent2Agent (A2A):
  - On-chain publishing AgentCards как смарт-контракты
  - Tamper-proof, verifiable agent identities через DLT
  - x402-микроплатежи для agent-to-agent транзакций
  - Возможность discovery agents через on-chain registry
- **Инсайт:** Решает **identity + discovery**, но НЕ решает **performance reputation**. AgentCards — это статичные визитки, не живая история.

#### [arXiv:2602.???] — "The Agent Economy: A Blockchain-Based Foundation for Autonomous AI Agents"
- **Автор:** Minghui Xu | **Дата:** февраль 2026
- **Суть:** Пропоузал на создание Agent Economy где агенты — экономические peers людей:
  - Агенты имеют legal identity и могут держать assets
  - Агенты получают платежи напрямую
  - Blockchain как foundation для agent autonomy
- **Инсайт:** Высокоуровневая архитектурная концепция. Подтверждает: поле горячее, но реализаций нет.

### 1.2 Что описывают учёные: ключевые проблемы

1. **Проблема идентичности** — агенты не имеют persistent, verifiable identity. Каждый запуск может быть "новым" агентом.

2. **Проблема верификации performance** — как доказать, что агент реально выполнил задачу, а не солгал? Self-reported данные нельзя доверять.

3. **Проблема incentive-compatibility** — без репутационных стейков агенты не мотивированы работать честно.

4. **Проблема сибил-атак** — один актор может создать тысячи "агентов" с чистой репутацией.

5. **Проблема Byzantine behavior** — агент может намеренно саботировать или давать плохие результаты.

6. **MCP Tool Manipulation** — агенты могут получать неверные инструкции через misleading tool descriptions (arXiv 2026).

### 1.3 Теоретические решения из академии

| Подход | Описание | Проблема |
|--------|----------|----------|
| Blockchain reputation tracking | Smart contracts записывают task outcomes | Кто верифицирует outcomes? |
| DID + Verifiable Credentials | Децентрализованная идентичность | Нет link к реальному поведению |
| TEE Attestations | Proof что агент выполнял правильный код | Сложно, медленно, дорого |
| Zero-Knowledge Proofs | Privacy-preserving verification | Очень сложно для произвольных задач |
| Stake-based reputation | Агенты ставят токены как залог | Не решает проблему качества |

---

## 2. КАРТА КОНКУРЕНТОВ

### 2.1 Полная таблица

| Проект | Что делает | Тип | Решает reputation? | Недостатки |
|--------|-----------|------|-------------------|------------|
| **Fetch.ai / AgentVerse** | Реестр AI-агентов с Almanac smart contract. Агенты регистрируются on-chain, получают адрес. | Agent marketplace | ❌ Нет | Только регистрация и discovery. Нет данных о performance. Рейтингов нет. |
| **Autonolas / Olas Network** | Decentralized AI agents с wallet (Safe). Sovereign & decentralized agents. On-chain registration. | Agent framework | ❌ Нет | Фокус на composition и staking, не на performance history. Нет публичного reputation score. |
| **Orange Protocol** | Trustless decentralized reputation для Web3 через zkTLS. Human reputation (DeFi activity, social). | Reputation protocol | ⚠️ Частично | Для ЛЮДЕЙ, не агентов. DeFi-centric: Uniswap, AAVE, PancakeSwap. Нет концепции agent performance. |
| **Karma3 Labs** | On-chain reputation через graph analysis (EigenTrust). Используется Farcaster, Lens. | Reputation engine | ⚠️ Частично | Для людей/аккаунтов. Работает с social graph. Нет concept of agent tasks/outcomes. |
| **Gitcoin Passport** | Sybil resistance через aggregation of credentials. Humanity score. | Identity / sybil resist | ❌ Нет | Для людей. Proof of humanity, не proof of agent quality. |
| **EAS (Ethereum Attestation Service)** | Universal attestation infrastructure. 8.7M+ attestations. Machine-to-Machine attestations supported. | Attestation layer | ⚠️ Частично | ИНФРАСТРУКТУРА, не готовое решение. Кто будет делать attestations об agent performance — не определено. |
| **ERC-6551 (Token Bound Accounts)** | NFT как account с историей. NFT может держать активы и делать транзакции. | ERC standard | ❌ Нет | Концепция account-per-NFT. Не создан для agent reputation. |
| **Numerai** | Prediction market где модели соревнуются, ставят NMR. Verifiable ML performance on-chain. | ML tournament | ✅ Да (частично) | Только для финансовых предсказаний. Закрытая экосистема. Нет universality. |
| **NEAR AI** | Private inference с TEE (Intel TDX). Hardware attestation каждого запроса. | Verifiable AI infra | ⚠️ Частично | Доказывает, что код выполнен в secure environment. Не доказывает quality/performance. |
| **Bittensor** | Decentralized ML network. Miners соревнуются, validators оценивают. TAO tokens за quality. | Incentivized ML net | ✅ Да (нишево) | Только для ML-моделей внутри Bittensor. Сложная subnet-архитектура. Нет универсального agent layer. |
| **Gig Economy (Upwork/Fiverr)** | Рейтинги фрилансеров. Centralized. | Web2 | ✅ Да (аналог) | Centralized, гейткипер, можно купить отзывы, нет verifiability. |

### 2.2 Ключевые выводы о конкурентах

1. **Fetch.ai Almanac** — ближайший конкурент по identity, но нет репутации
2. **EAS** — лучшая инфраструктура для строительства ON TOP
3. **Orange Protocol** — конкурент по идеологии, но для людей
4. **Bittensor** — единственный с реальной verifiable performance, но нишевый (ML-only)
5. **Numerai** — proof of concept что это работает (для финансов)

**ГЛАВНЫЙ ВЫВОД: Нет ни одного проекта с универсальной, on-chain, tamper-proof системой репутации для AI-агентов по произвольным задачам.**

---

## 3. ГЭПЫ И ВОЗМОЖНОСТИ

### 3.1 Незанятые ниши

#### Ниша 1: Universal Agent Performance Registry
**Описание:** Публичный on-chain реестр, где любой агент может быть верифицирован по реальной истории выполненных задач.  
**Отличие от существующего:** Fetch.ai регистрирует агентов, но не их performance. Orange Protocol — для людей. EAS — инфраструктура без специализации.  
**Почему это важно:** "Before giving an agent access to money, you need to know if it earned that trust."

#### Ниша 2: Agent Task Outcome Attestation
**Описание:** Стандартизированная схема аттестации результатов задач. Кто угодно может аттестовать outcome: другой агент, смарт-контракт, oracle, человек.  
**Отличие:** EAS позволяет attestations, но нет стандартной схемы для "agent completed task X with outcome Y".  
**Ценность:** Composable — можно использовать поверх любого agent framework.

#### Ниша 3: Cross-Framework Agent Reputation
**Описание:** Репутация, которая работает независимо от фреймворка (OpenAI Agents, Claude, LangChain, Fetch.ai, Olas).  
**Отличие:** Bittensor создал репутацию, но только внутри своей экосистемы. Нет portable reputation.  
**Ценность:** "Agent passport" — переносимый между системами.

#### Ниша 4: Staked Reputation с реальным Skin in the Game
**Описание:** Агент депозирует токены как залог. Плохая performance → slash stake. Хорошая → репутация растёт + rewards.  
**Отличие:** Теоретически описывается в академических работах, но нет production реализации для AI-агентов.  
**Ценность:** Incentive-compatible — агенты мотивированы быть честными.

### 3.2 Самый ценный гэп для хакатона

**СВЯЗКА:** On-chain Performance Attestation + Agent Identity (DID) + Публичный Explorer

Это можно построить за 10 дней потому что:
- Инфраструктура (EAS, Base/Optimism, ERC-6551) уже существует
- Нужно создать СХЕМУ + КОНТРАКТЫ + UI
- Нет нужды в ZKP или TEE на MVP

---

## 4. РЕКОМЕНДАЦИЯ ПО MVP ДЛЯ ХАКАТОНА

### 4.1 Название проекта (предложение)
**AgentRep** / **TrustLedger** / **RepProof** — Agent Reputation Registry

### 4.2 Один-строчник
> "The on-chain resume for AI agents: immutable, verifiable, cross-framework performance history."

### 4.3 Что строить (конкретно)

#### Компонент 1: Agent Registry Smart Contract (2-3 дня)
```solidity
// На Base (cheap, fast EVM)
contract AgentRegistry {
    struct Agent {
        address owner;
        string agentDID;        // did:ethr:base:0x...
        string framework;       // "openai" | "claude" | "langchain" | "fetch"
        string metadataURI;     // IPFS с capability description
        uint256 registeredAt;
        uint256 reputationScore;
        uint256 tasksCompleted;
        uint256 tasksSucceeded;
    }
    
    mapping(bytes32 => Agent) public agents; // agentId => Agent
    mapping(bytes32 => TaskAttestation[]) public taskHistory;
}
```

#### Компонент 2: Task Outcome Attestation Schema (1-2 дня)
```
// EAS Schema (на Optimism или Base)
schema: {
    agentId: bytes32,       // unique agent identifier
    taskId: bytes32,        // unique task identifier
    taskType: string,       // "code" | "research" | "trading" | "moderation"
    success: bool,          // did it complete?
    score: uint8,           // 0-100 quality score
    attesterType: string,   // "human" | "agent" | "oracle" | "contract"
    evidenceURI: string,    // IPFS hash с доказательствами
    timestamp: uint256
}
```

#### Компонент 3: Reputation Calculation (1 день)
```python
# Простой алгоритм с decay
reputation_score = (
    success_rate * 0.4 +
    quality_score_avg * 0.3 +
    task_volume * 0.2 +
    recency_factor * 0.1
)
# Time decay: старые results весят меньше (как ELO в шахматах)
```

#### Компонент 4: Public Explorer / API (2-3 дня)
- Веб-интерфейс: поиск агента по ID/DID/address
- Публичный API: `GET /agent/:id/reputation`
- Embeddable badge: `https://agentrepr.xyz/badge/:agentId`

#### Компонент 5: Demo Flow (2 дня)
1. BigBoss регистрируется как агент (мета-демо!)
2. Выполняет задачи в рамках хакатона
3. Outcomes записываются on-chain через аттестации
4. Живая reputation score видна всем

### 4.4 Технический стек (оптимальный для 10 дней)

| Слой | Технология | Причина |
|------|-----------|---------|
| Blockchain | Base (Mainnet или Sepolia) | Cheap gas, EVM, Coinbase ecosystem, ETH-aligned |
| Attestations | EAS (Ethereum Attestation Service) | Public good, 8.7M+ attestations, готовая инфра |
| Identity | DID:ethr | W3C стандарт, простая интеграция |
| Storage | IPFS/Filecoin | Для evidence и metadata |
| Backend API | Node.js / Python | Быстро |
| Frontend | Next.js | Быстро, деплой Vercel |
| Smart Contracts | Solidity + Foundry | Стандарт |

### 4.5 Что НЕ делать (out of scope для MVP)

- ❌ ZKP (слишком сложно за 10 дней)
- ❌ TEE / SGX аттестации (инфраструктура требует месяцы)
- ❌ Staking механизм (можно добавить позже)
- ❌ Cross-chain (Base достаточно)
- ❌ Автоматическая верификация outcomes (на MVP — trusted attesters)

### 4.6 Что делает этот MVP ценным

1. **Первый** универсальный on-chain agent reputation registry
2. **Composable** — работает с любым framework через API
3. **Self-demo** — BigBoss может сам участвовать как агент, его reputation строится в реальном времени хакатона
4. **Narrative fit** — "Before you give your AI agent access to money, check its reputation score" — идеально ложится на тему хакатона и тренд 2026
5. **EAS integration** = Ethereum ecosystem goodwill

### 4.7 Pitch в одном абзаце

> "Every freelancer on Upwork has a rating. Every driver on Uber has reviews. But AI agents — which are being given access to wallets, APIs, and critical systems — have nothing. AgentRep is the on-chain reputation layer for AI agents: immutable task history, verifiable attestations, cross-framework support. Built on EAS and Base. Before you delegate to an agent, check if it earned the trust."

### 4.8 Возможные differentiators для победы

1. **Meta-demo:** Использовать BigBoss + суб-агенты как первые "registered agents" — все задачи хакатона записаны on-chain
2. **Open schema:** Предложить EAS schema как стандарт для community — "не проект, а протокол"
3. **Integration hooks:** SDK-wrapper для OpenAI Agents SDK, LangChain — любой агент в 3 строки кода
4. **Agentic judges:** Если хакатон оценивается агентами, то агент-судья может сам проверить reputation agent-участника — это элегантная рекурсия

---

## 5. ДОПОЛНИТЕЛЬНЫЕ ИНСАЙТЫ

### 5.1 Смежные протоколы для изучения
- **ERC-6551 (Token Bound Accounts)** — NFT как account. Можно выдать агенту NFT-паспорт с привязанным кошельком, который накапливает историю.
- **x402 standard** — HTTP 402 для micropayments между агентами. Если агент платит за сервис, это само по себе репутационный сигнал.
- **Google A2A Protocol** — новый стандарт Agent-to-Agent коммуникации. AgentCards уже содержат identity. Можно добавить reputation layer поверх.

### 5.2 Риски и критика

| Риск | Описание | Митигация |
|------|----------|-----------|
| Oracle Problem | Кто аттестует outcomes? | MVP: trusted attesters (люди/контракты). V2: optimistic dispute resolution |
| Sybil Resistance | Много агентов одного актора | Agent ID = DID anchored to wallet, не анонимный |
| Gaming Reputation | Агент специально берёт лёгкие задачи | Task difficulty scoring (будущее) |
| Cold Start | Новый агент = нет reputation | Bootstrap period: legacy credentials, human vouching |
| Централизация attesters | Если мало attesters — centralized | Open attester network со временем |

### 5.3 Рыночный контекст 2026

- AI агенты быстро получают доступ к реальным деньгам и системам
- OpenAI, Anthropic, Google — все запустили agent frameworks в 2025
- Нет стандарта для "should I trust this agent?"
- Regulation incoming — EU AI Act требует auditability
- Demand side: DevOps, finance, legal — все хотят auditable AI actions

---

## 6. БЫСТРЫЙ ПЛАН НА 10 ДНЕЙ ХАКАТОНА

| День | Задача |
|------|--------|
| 1 | Финализация архитектуры, выбор chain (Base), дизайн schema |
| 2 | Smart contract: AgentRegistry, базовый деплой на testnet |
| 3 | EAS Schema registration, attestation flow |
| 4 | Backend API (register agent, submit attestation, get reputation) |
| 5 | Frontend: основные страницы (Home, Agent Profile, Leaderboard) |
| 6 | Integration: Fetch.ai uAgents adapter, OpenAI Agents SDK wrapper |
| 7 | Demo flow: BigBoss регистрируется, первые задачи записаны |
| 8 | Полировка UI, README, docs |
| 9 | Security review, тест on mainnet (Base) |
| 10 | Pitch prep, submission |

---

## ИСТОЧНИКИ

### Академические работы
1. Qi et al. (2025) "Towards Transparent and Incentive-Compatible Collaboration..." arXiv:2509.16736
2. Acharya (2025) "Secure Autonomous Agent Payments..." arXiv:2511.15712
3. Vaziry et al. (2025) "Towards Multi-Agent Economies..." arXiv:2507.19550
4. Xu (2026) "The Agent Economy: A Blockchain-Based Foundation..." arXiv:Feb 2026

### Протоколы и стандарты
- Ethereum Attestation Service (EAS): https://attest.org — 8.7M+ attestations, Machine-to-Machine listed
- ERC-6551 Token Bound Accounts: https://eips.ethereum.org/EIPS/eip-6551
- ERC-7683 Cross Chain Intents: https://eips.ethereum.org/EIPS/eip-7683
- Fetch.ai uAgents + Almanac: https://github.com/fetchai/uAgents

### Репутационные протоколы
- Orange Protocol (zkTLS reputation): https://orangeprotocol.io
- Karma3 Labs (EigenTrust): https://karma3labs.com
- Gitcoin Passport (Sybil resistance): https://gitcoin.co

### Agent Frameworks
- Autonolas/Olas Network: https://olas.network
- NEAR AI (TEE inference): https://near.ai
- The Synthesis Hackathon: https://synthesis.md

---

*Анализ проведён: 7 марта 2026. Следующий апдейт — после анонса партнёров 9 марта.*
