# Исследование: Репутация и оценка AI-агентов в крипто-сфере

**Дата:** 7 марта 2026  
**Контекст:** Анализ для хакатона The Synthesis — трек "Agents that trust"  
**Цель:** Понять рынок, найти незанятую нишу, сформулировать MVP

---

## 1. ТАБЛИЦА КОНКУРЕНТОВ

### 1.1 Подробный анализ по каждому игроку

---

### 🏆 NUMERAI
**URL:** https://numer.ai  
**Категория:** ML predictions tournament → hedge fund

| Параметр | Данные |
|----------|--------|
| Пользователи | ~10 000+ активных data scientists |
| AUM | Частный хедж-фонд, не раскрывает (сотни млн $) |
| Объём ставок NMR | Stake threshold: 72,000 NMR (основной турнир) |
| Дата запуска | 2015 |

**Как оценивают performance:**
- **CORR (Correlation)** — корреляция предсказаний с реальными доходностями акций за 20 дней
- **MMC (Meta Model Contribution)** — уникальный вклад модели в Meta Model (насколько модель добавляет новую информацию)
- **FNC (Feature Neutral Correlation)** — нейтрализованная корреляция (информационная, без пейаутов)
- **Reputation** = среднее значение score за 1 год (стейк-взвешенное для аккаунта)
- Scoring занимает 20 дней (20D2L система), обновляется ежедневно

**UX оценка: 6/10**
- Хорошо: четкие метрики, публичный leaderboard
- Плохо: данные обфусцированы (нельзя торговать самостоятельно), нет понятного объяснения для non-technical

**API для AI-агентов:**
- Да! NumerAPI (Python), полная программная поддержка
- Автоматическая загрузка предсказаний, скачивание данных
- Machine-readable: CSV, parquet

**Что плохо / чего не хватает:**
- Предсказания оцениваются только на акциях (не крипто)
- Обфусцированные данные — нельзя интерпретировать реальный рынок
- Нет real-time scoring, только 20-дневный лаг
- Нет cross-protocol репутации
- Нет доказательств что скор → реальная прибыль (непрозрачно)

---

### 🔵 BITTENSOR (Trading Subnets)
**URL:** https://bittensor.com | Subnets: SN8, SN29, SN46  
**Категория:** Decentralized ML network с incentive механизмами

| Параметр | Данные |
|----------|--------|
| Суммарная капитализация TAO | ~$1-3 млрд (волатильно) |
| Активных майнеров/валидаторов | Тысячи по всем subnets |
| Subnet 8 (Prediction) | Финансовые предсказания |
| Subnet 29 | Trading signals |

**Как оценивают performance:**
- **Validators** оценивают качество работы **miners**
- Оценка субъективна — каждый subnet задаёт свои метрики
- Вознаграждение в TAO пропорционально scores от validators
- Нет единого стандарта метрик между subnets

**UX оценка: 3/10**
- Техническое, непонятно обычному пользователю
- taostats.io — analytics dashboard, но только on-chain данные
- Нет user-friendly leaderboard с performance metrics

**API для AI-агентов:**
- Да, но требует настройки Bittensor SDK
- Данные доступны через taostats API
- Нет стандартизированного формата performance data

**Что плохо / чего не хватает:**
- Нет единого стандарта оценки между subnets
- Совершенно непонятно non-technical пользователю
- Validator'ы могут быть предвзяты (gaming the system)
- Нет верифицированной истории производительности вне Bittensor

---

### 🔷 dHEDGE
**URL:** https://dhedge.org  
**Категория:** On-chain fund management (DeFi vaults)

| Параметр | Данные |
|----------|--------|
| TVL | **$33.1M** (на март 2026) |
| Вaults | 3,491 |
| Managers | 2,168 |
| Manager Fees Earned | $1.07M |
| Сети | Base ($14.2M), Arbitrum ($7.8M), Optimism ($5.1M), Ethereum ($3.9M), Polygon ($2M) |

**Как оценивают performance:**
- **Return %** (1D, 1W, 1M, 6M, 1Y, Total)
- **Risk Factor** (1/5 → 5/5) — собственная рисковая оценка
- **Score** — числовой, отображается в leaderboard (методология не раскрыта публично)
- **Value Managed** — AUM вашего vault
- Пример из leaderboard: "Formadores Wealth Growth" — $1.51M, +118% total, Risk: 2/5, Score: 1595

**UX оценка: 7/10**
- Хорошо: понятные таблицы, цветовая кодировка риска, публичный explore
- Хорошо: on-chain верификация каждой сделки
- Плохо: "Score" непрозрачный (неясно как считается)
- Плохо: нет Sharpe ratio, max drawdown, win rate

**API для AI-агентов:**
- Есть SDK: `@dhedge/v2-sdk` (npm)
- Dune Analytics интеграция
- Нет чистого machine-readable performance API

**Что плохо / чего не хватает:**
- Score непрозрачный — нет объяснения методологии
- Нет метрик risk-adjusted return (Sharpe)
- Нет comparison с benchmark (BTC, ETH, стейблкоин yield)
- Маленькое community (2168 managers)
- Нет фокуса на AI-агентах

---

### 🟢 ENZYME FINANCE
**URL:** https://enzyme.finance  
**Категория:** On-chain asset management infrastructure

| Параметр | Данные |
|----------|--------|
| Total transaction volume | **+$7 Billion** |
| Assets under technology | **+$200 Million** |
| Лет в работе | 8+ лет |
| Security breaches | 0 |

**Как оценивают performance:**
- Enzyme.Blue — DeFi стратегии (видно NAV, returns)
- Enzyme.Onyx — tokenized funds для институций
- Детальная история транзакций on-chain
- Returns, NAV, allocation — всё видно

**UX оценка: 5/10**
- Хорошо: институциональный уровень, надёжность
- Плохо: SPA (Single Page App) — не загружается без JS, сложно для агентов
- Плохо: UI перегружен для non-technical
- Недавно ребрендинг, раньше было больше retail-ориентированности

**API для AI-агентов:**
- Есть GraphQL API (TheGraph)
- Нет официального высокоуровневого performance API
- Нужно self-build поверх on-chain данных

**Что плохо / чего не хватает:**
- Нет стандартизированного "agent score"
- Shift в сторону enterprise/institutional, теряют retail
- Нет leaderboard с простыми метриками
- Нет кросс-протокольного tracking

---

### 🟣 POLYMARKET
**URL:** https://polymarket.com  
**Категория:** Prediction markets (world's largest)

| Параметр | Данные |
|----------|--------|
| Объём торгов | Сотни миллионов $ в год (2024: >$3 млрд) |
| Активные рынки | Тысячи одновременно |
| Пример рынка | BTC 5-minute: $43M vol |
| Пользователи | Сотни тысяч |

**Как оценивают performance предикторов:**
- **Есть leaderboard** (через Data API), но в UI — минимально представлен
- API: `https://data-api.polymarket.com` — user positions, trades, leaderboards
- Метрики доступны через API: profit/loss по рынкам, win rate
- НЕТ публичного Brier score
- НЕТ calibration display для пользователей (в отличие от Manifold)
- Builders API — можно строить поверх данных

**UX оценка: 8/10 для trading, 3/10 для predictor reputation**
- Хорошо: понятный торговый интерфейс
- Хорошо: богатый публичный API
- Плохо: нет профиля предиктора с агрегированными метриками
- Плохо: нет Brier score, calibration curves для пользователей

**API для AI-агентов:**
- Да! Лучший API в классе prediction markets
- Gamma API, Data API, CLOB API — все публичные (кроме trading)
- Python и TypeScript SDK
- Machine-readable: REST/JSON

**Что плохо / чего не хватает:**
- Нет reputation system для предикторов
- Нет публичных calibration stats
- Нет агрегированного "predictor score" на profile page
- Бот-торговля не маркируется/не верифицируется отдельно

---

### 🟡 MANIFOLD MARKETS
**URL:** https://manifold.markets  
**Категория:** Play-money prediction markets (+ real money)

| Параметр | Данные |
|----------|--------|
| Пользователи | ~100K+ зарегистрированных |
| Объём | Play money (mana), небольшой реальный |
| Особенность | Calibration tracking, Brier score |

**Как оценивают performance:**
- **Calibration page** — сравнение предсказаний с реальными исходами
- Показывают: "Если говоришь 70%, событие происходит в 70% случаев"
- Profit/Loss leaderboard по mana
- Индивидуальный calibration score
- Bayesian update tracking

**UX оценка: 7/10**
- Хорошо: calibration очень понятна визуально
- Хорошо: open data philosophy
- Плохо: play-money, не серьёзное
- Плохо: нет реального финансового stake

**API для AI-агентов:**
- Public REST API
- GraphQL
- Open-source кодовая база

**Что плохо / чего не хватает:**
- Низкие stakes — нет skin in the game
- Нет крипто-специфики
- Нет кросс-платформенного tracking

---

### 🔶 GAUNTLET NETWORK
**URL:** https://gauntlet.network  
**Категория:** Risk management для DeFi протоколов (B2B)

| Параметр | Данные |
|----------|--------|
| Клиенты | Aave, Jupiter, GMX, и другие топ-DeFi |
| Позиционирование | Institutional-grade risk management |

**Как оценивают performance:**
- Агентное моделирование (simulation-based)
- Stress testing параметров протоколов
- Выдают рекомендации по collateral ratios, liquidation thresholds
- **Не публичные** оценки — B2B, закрытые отчёты

**UX оценка: N/A (B2B)**
- Не для retail пользователей
- Не имеет public leaderboard

**API для AI-агентов:**
- Нет публичного API
- Только для клиентов протоколов

**Что плохо / чего не хватает:**
- Нет публичного reputation layer
- Нет оценки отдельных агентов/менеджеров
- Полностью closed/enterprise

---

### 🔴 CHAOS LABS
**URL:** https://chaoslabs.xyz  
**Категория:** Risk analytics и oracle risk для DeFi

| Параметр | Данные |
|----------|--------|
| Transactioned processed | **$5 Trillion** |
| Total Value Secured | **$10 Billion** |
| Клиенты | Aave, Jupiter, GMX |

**Как оценивают performance:**
- AI-driven risk engine для DeFi протоколов
- Real-time parameter recommendations
- Oracle manipulation detection
- **Закрытая система** — нет публичных agent scores

**UX оценка: N/A (B2B)**

**Что плохо / чего не хватает:**
- Нет публичного reputation layer
- Только enterprise клиенты

---

### Augur (Rebooting)
- Статус: "Rebooting" — фактически мёртв в текущей форме
- Исторически: первый decentralized prediction market, но проблемы с UX
- Нет активных данных

---

### TokenSets / Set Protocol
- Был популярен в 2019-2021 (DeFi Summer)
- Сейчас: очень низкая активность, tokensets.com недоступен
- Идея: automated rebalancing strategies (ETHBTC 50/50, momentum, etc.)
- Проблема: не масштабировался, нет performance tracking

---

## 2. СВОДНАЯ ТАБЛИЦА КОНКУРЕНТОВ

| Платформа | Пользователи/AUM | Метрики | UX (1-10) | API для агентов | Главный недостаток |
|-----------|-----------------|---------|-----------|-----------------|-------------------|
| Numerai | ~10k users, private hedge fund | CORR, MMC, Reputation (1Y avg) | 6 | ✅ Отличный (NumerAPI) | Только акции, обфусцировано |
| Bittensor Subnets | тысячи miners/validators | Subnet-specific, TAO rewards | 3 | ⚠️ Технический | Нет стандарта, непонятно |
| dHEDGE | $33M TVL, 2168 managers | Return%, Risk 1-5, Score | 7 | ⚠️ SDK есть | Score непрозрачный |
| Enzyme Finance | $200M AUM, $7B volume | NAV, Returns | 5 | ⚠️ GraphQL | Enterprise shift, нет leaderboard |
| Polymarket | $3B+ объём/год | P&L (через API), нет Brier | 8/3 | ✅ Лучший API | Нет predictor reputation |
| Manifold | ~100K users | Calibration, P&L mana | 7 | ✅ Public API | Play-money, нет крипто |
| Gauntlet | Top DeFi (Aave etc.) | Simulation-based risk | B2B | ❌ Нет | Закрытый B2B |
| Chaos Labs | $10B secured | Oracle/liquidation risk | B2B | ❌ Нет | Закрытый B2B |
| Augur | Мёртв | — | — | — | Умер |
| TokenSets | Мёртв | — | — | — | Умер |

---

## 3. МЕТРИКИ ОЦЕНКИ В КРИПТО-СПЕЦИФИКЕ

### 3.1 Trading Performance

| Метрика | Описание | Важность | Сложность |
|---------|---------|----------|-----------|
| **Sharpe Ratio** | (Ret - RF) / σ(Ret), годовой | 🔴 Критично | Средняя |
| **Sortino Ratio** | Только downside vol | 🔶 Важно | Средняя |
| **Max Drawdown** | Максимальное падение от пика | 🔴 Критично | Низкая |
| **Win Rate** | % прибыльных сделок | 🟡 Полезно | Низкая |
| **PnL (абсолют)** | Чистая прибыль $ | 🔴 Критично | Низкая |
| **PnL (%)** | % от начального капитала | 🔴 Критично | Низкая |
| **Alpha vs benchmark** | Превышение над BTC/ETH/index | 🔶 Важно | Средняя |
| **Calmar Ratio** | Annual Return / Max Drawdown | 🔶 Важно | Низкая |
| **Trade count** | Количество сделок | 🟡 Контекст | Низкая |
| **Avg hold time** | Средняя длительность позиции | 🟡 Контекст | Низкая |
| **Slippage** | Средний slippage при execution | 🟡 Полезно | Средняя |

**Крипто-специфика:**
- Бенчмарк: BTC или ETH (не risk-free rate)
- Crypto Sharpe отличается от TradFi (24/7 рынок, нет risk-free)
- Важно разделять: spot, perps, DeFi
- Gas costs как реальные издержки

### 3.2 Prediction Markets

| Метрика | Описание | Важность |
|---------|---------|----------|
| **Brier Score** | Mean squared error предсказаний (0-1, ниже = лучше) | 🔴 Критично |
| **Calibration** | Соответствие % предсказаний реальным исходам | 🔴 Критично |
| **Log Score** | Логарифмическая оценка, штрафует за уверенные ошибки | 🔶 Важно |
| **ROI per prediction** | $ прибыли / $ вложено per bet | 🔴 Критично |
| **Kelly Criterion adherence** | Насколько optimal sizing | 🟡 Экспертное |
| **Resolution rate** | % рынков, где участвовал | 🟡 Контекст |
| **Market selection bias** | Easy markets vs hard markets | 🔶 Важно |
| **Edge (EV)** | Expected value от позиций | 🔶 Важно |

**Крипто-специфика prediction markets:**
- Ликвидность важна (нельзя сравнивать $100 bet vs $100K bet)
- Crypto markets коррелируют между собой — нужна диверсификация
- Timing (ранний вход vs поздний) влияет на прибыльность

### 3.3 Yield / APR Management

| Метрика | Описание | Важность |
|---------|---------|----------|
| **Actual APR** | Реальный годовой доход % | 🔴 Критично |
| **APR vs benchmark** | vs stablecoin yield, vs holding ETH | 🔴 Критично |
| **Gas efficiency** | Gas / Total yield ratio | 🔶 Важно |
| **Rebalance frequency** | Кол-во rebalance в месяц | 🟡 Контекст |
| **Impermanent Loss** | Для LP позиций | 🔴 Критично |
| **Net APR (after gas)** | APR минус все издержки | 🔴 Критично |
| **IL-adjusted APR** | APR с учётом IL | 🔶 Важно |
| **Uptime %** | % времени агент активен | 🟡 Полезно |
| **Protocol risk** | Диверсификация по протоколам | 🔶 Важно |

**Крипто-специфика yield:**
- Gas стоимость может съесть весь yield на мелких позициях
- Impermanent Loss — главный враг LP стратегий
- Protocol risk (Aave, Compound, etc.) — нужна диверсификация
- "Real yield" vs "Inflationary yield" (token emissions)

### 3.4 Risk Management

| Метрика | Описание | Важность |
|---------|---------|----------|
| **Adherence to risk parameters** | % времени в заданных лимитах | 🔴 Критично |
| **Max drawdown vs target** | Реальный drawdown vs установленный лимит | 🔴 Критично |
| **VaR (Value at Risk)** | Максимальный убыток с заданной вероятностью | 🔶 Важно |
| **Liquidation proximity** | Близость к ликвидации | 🔴 Критично |
| **Concentration risk** | Диверсификация позиций | 🔶 Важно |
| **Slippage on exits** | Execution качество при аварийных выходах | 🔶 Важно |
| **Circuit breaker activations** | Кол-во раз агент остановился сам | 🟡 Контекст |

---

## 4. ЧТО НЕ СУЩЕСТВУЕТ (НЕЗАНЯТЫЕ НИШИ)

### 4.1 Главный gap: Единый Reputation Score для крипто-агентов

**НЕТ** единой платформы, которая бы:
1. Агрегировала performance агента **поперёк нескольких протоколов**
2. Давала единый score, понятный как человеку, так и машине
3. Верифицировала историю on-chain (не self-reported)
4. Покрывала все 4 домена: trading + predictions + yield + risk mgmt

**Почему этого нет:**
- dHEDGE покрывает только своих vault managers
- Numerai работает только с ML-предсказаниями на акциях
- Polymarket имеет данные, но не показывает reputation
- Нет стандарта описания capabilities AI-агента

### 4.2 Нет верифицированной кросс-протокольной истории

Сейчас агент может:
- Показать хорошую историю на dHEDGE
- Иметь плохую историю на Enzyme (другой аккаунт)
- Торговать на Polymarket без связи с DeFi историей

**Gap:** Нет способа связать wallets/accounts агента в единый verified record

### 4.3 Нет стандарта описания AI-агента

Нет аналога "резюме" для агентов:
- Что умеет (capabilities)
- На чём специализируется (trading / yield / predictions)
- Какой risk profile
- Проверяемая история (verifiable track record)
- Какие протоколы поддерживает

**Сравнение:** В TradFi есть GIPS (Global Investment Performance Standards), в крипто — ничего подобного.

### 4.4 UX Gap: нет bridge между human и machine

Существующие платформы:
- Либо удобны людям (Polymarket UI, dHEDGE UI)
- Либо для разработчиков (Bittensor, NumerAPI)
- **НЕТ** платформы, где один и тот же score одновременно: понятен человеку визуально + machine-readable через API

### 4.5 UX анализ существующих платформ

**Как показывают performance:**

| Платформа | Формат | Human-friendly | Machine-readable |
|-----------|--------|----------------|-----------------|
| Numerai | Числа + графики CORR/MMC | Средне (требует знания метрик) | ✅ API + parquet |
| dHEDGE | Return %, Risk 1-5, Score, таблица | ✅ Хорошо | ⚠️ Частично (SDK) |
| Enzyme | NAV chart, portfolio allocation | ⚠️ Средне | ⚠️ GraphQL |
| Polymarket | Цены, объём | ✅ Понятно для торговли | ✅ Отличный API |
| Manifold | Calibration curve, P&L | ✅ Визуально красиво | ✅ Public API |
| Bittensor | Raw on-chain числа | ❌ Непонятно | ⚠️ Технический |

**Вывод:** Лучший human UX — Polymarket и dHEDGE. Лучший machine API — Polymarket и Numerai. Никто не делает обе одновременно через единую reputation метрику.

---

## 5. MVP РЕКОМЕНДАЦИЯ

### 5.1 Ниша: AgentScore — Open Reputation Layer для крипто-агентов

**Формулировка позиционирования:**
> "Единый, верифицированный, понятный score для AI-агентов в крипто — торговля, предсказания, DeFi yield. Для людей — визуально. Для агентов — JSON API."

**Почему это WIN:**
- Прямо в теме хакатона "Agents that trust"
- Нет прямых конкурентов с таким positioning
- On-chain верификация — нельзя подделать
- Dual UX (human + machine) — инновационно
- Реально нужно крипто-рынку (DeFi растёт, AI agents растут)

### 5.2 Ключевые метрики MVP Score (5 метрик)

**AgentScore = взвешенная сумма 5 компонентов (каждый 0-100)**

#### Метрика 1: Performance Score (вес 30%)
```
Performance = weighted average of:
  - PnL % (risk-adjusted, vs benchmark) — 50%
  - Sharpe Ratio (annualized) — 30%
  - Win Rate — 20%
```
*Нормализация: Sharpe 2+ → 100, Sharpe < 0 → 0*

#### Метрика 2: Risk Discipline Score (вес 25%)
```
Risk = adherence to declared parameters:
  - Max Drawdown actual vs declared limit — 40%
  - Position sizing adherence — 30%
  - Protocol diversification — 30%
```
*Ключевая инновация: агент ДЕКЛАРИРУЕТ параметры, мы проверяем соблюдение*

#### Метрика 3: Prediction Accuracy Score (вес 20%)
```
Prediction = for prediction market agents:
  - Brier Score (normalized) — 50%
  - Calibration score — 30%
  - ROI per prediction — 20%
```
*Для агентов без prediction markets — нейтральный компонент*

#### Метрика 4: Consistency Score (вес 15%)
```
Consistency = stability over time:
  - Rolling 30D / 90D / 365D score stability
  - % rounds/periods with positive performance
  - Recency weight (last 90D = 50% weight)
```
*Важно: защита от cherry-picking — нельзя показать 1 удачный месяц*

#### Метрика 5: Transparency Score (вес 10%)
```
Transparency = verifiability:
  - % сделок on-chain (верифицируемы) — 50%
  - Declared parameters documented — 25%
  - Minimum activity threshold met — 25%
```
*Бонус за полную on-chain историю*

**Итоговая формула:**
```
AgentScore = 0.30 * Performance 
           + 0.25 * RiskDiscipline 
           + 0.20 * PredictionAccuracy 
           + 0.15 * Consistency 
           + 0.10 * Transparency
```

**Диапазон:** 0-100 с уровнями:
- 0-20: Unproven / новый агент
- 21-40: Emerging
- 41-60: Established  
- 61-80: Trusted
- 81-100: Elite

### 5.3 UX Подход: Dual-Layer Design

#### Human Layer (визуально)

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
- Фильтры: по категории (trading / yield / predictions)
- Сортировка: по AgentScore, по PnL, по Risk Score
- Временные фреймы: 30D, 90D, 1Y, All Time
- Визуализация: bar charts, radar chart по 5 метрикам

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

**Schema (OpenAPI / JSON-LD):**
```yaml
AgentCapabilities:
  type: object
  properties:
    supported_domains:
      type: array
      items:
        enum: [trading, yield_farming, prediction_markets, risk_management]
    supported_protocols:
      type: array
    risk_parameters:
      $ref: '#/components/schemas/RiskParameters'
    track_record:
      $ref: '#/components/schemas/TrackRecord'
```

### 5.4 Data Sources для MVP

**On-chain (primary):**
- dHEDGE subgraph (GraphQL) — vault performance
- Polymarket Data API — predictor history
- Enzyme Blue subgraph — fund performance
- Aave/Compound — lending/borrowing history
- Uniswap — LP performance

**Off-chain (secondary):**
- Numerai API — ML tournament scores
- Bittensor taostats API — subnet performance

**Агрегация:**
- Кросс-протокольный matching по wallet address
- Нормализация метрик (разные timezones, единицы)
- Weighted scoring per domain

### 5.5 Дифференциаторы от конкурентов

| Фича | dHEDGE | Numerai | Polymarket | AgentScore (наш) |
|------|--------|---------|------------|------------------|
| Единый cross-protocol score | ❌ | ❌ | ❌ | ✅ |
| On-chain верификация | ✅ | ❌ | ⚠️ | ✅ |
| Machine-readable API | ⚠️ | ✅ | ✅ | ✅ |
| Human-friendly UI | ✅ | ⚠️ | ✅ | ✅ |
| AI-агент специфика | ❌ | ❌ | ❌ | ✅ |
| Risk adherence tracking | ❌ | ❌ | ❌ | ✅ |
| Prediction markets включены | ❌ | ❌ | ⚠️ | ✅ |
| Open standard | ❌ | ❌ | ❌ | ✅ |

---

## 6. ВЫВОДЫ И СТРАТЕГИЯ

### Ключевые инсайты:

1. **Ниша реально свободна** — никто не делает кросс-протокольный reputation layer для AI-агентов в крипто

2. **Data доступны** — Polymarket, dHEDGE, Enzyme имеют публичные API/subgraphs — можно строить поверх них

3. **Timing идеальный** — AI agents в крипто растут, проблема доверия к агентам становится актуальной (DeFAI тренд 2025-2026)

4. **Хакатон тема совпадает** — "Agents that trust" = именно про это

5. **Risk Discipline Score = ключевая инновация** — никто не проверяет следует ли агент собственным заявленным параметрам риска

### Риски проекта:

- **Data quality:** On-chain данных может быть недостаточно для Sharpe/Brier за короткое время
- **Gaming:** Агенты могут создавать fake history через множество аккаунтов → нужно minimum stake requirement
- **Complexity:** 5 метрик сложно объяснить за pitch → упростить до 3 для первого показа
- **Cold start:** Нет агентов в базе → нужно seed data (Polymarket top traders, dHEDGE top vaults)

### Рекомендованный MVP фокус для хакатона:

**Минимально жизнеспособный продукт:**
1. AgentScore = 3 метрики (Performance + Risk Discipline + Consistency)
2. Data из 2 источников: Polymarket + dHEDGE
3. Human UI: простой leaderboard + agent profile
4. Machine API: `/api/v1/agents/{id}/score` → JSON
5. Demo: 10-20 real agents (top Polymarket traders + top dHEDGE vaults)

**Pitch narrative:**
> "Прежде чем дать AI-агенту доступ к твоим деньгам — узнай, заслужил ли он это. AgentScore — первый верифицированный, on-chain, кросс-протокольный reputation layer для крипто-агентов. Понятен тебе. Понятен другим агентам."

---

## ПРИЛОЖЕНИЕ: Ссылки и ресурсы

### APIs доступные для интеграции:
- Polymarket Data API: `https://data-api.polymarket.com`
- Polymarket Gamma API: `https://gamma-api.polymarket.com`
- dHEDGE SDK: `npm install @dhedge/v2-sdk`
- dHEDGE Dune: `https://dune.com/dhedge`
- Numerai API: `pip install numerapi`
- Enzyme TheGraph: субграф на The Graph Protocol
- Bittensor taostats API: `https://dash.taostats.io/`

### Документация:
- Numerai Docs: https://docs.numer.ai
- Polymarket Docs: https://docs.polymarket.com
- dHEDGE Docs: https://docs.dhedge.org
- Enzyme Docs: https://docs.enzyme.finance
- Bittensor Docs: https://docs.learnbittensor.org

---

*Отчёт составлен: 7 марта 2026 | Субагент synthesis-crypto-research*
