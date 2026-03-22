# DEVMUS Progress — 2026-03-21

## Задача от BigBoss
E2E флоу + MeritSBT fix (дедлайн 22 марта)

---

## ✅ СДЕЛАНО

### 1. Приоритет 3 — Reference Agent agentId: not-registered → FIXED
- `0x9061bF` зарегистрирован в AgentRegistry NEW (`0x98b19578289ded629a0992403942adeb2ff217c8`) как **агент #6**
- TX: `0x0aac7daabd49331eccb1b88275d906e42904f063d914a8b77c61d39efa6853d4`

### 2. Приоритет 1 — E2E флоу — ПРОЙДЕН на task #72
| Step | TX | Status |
|------|-----|--------|
| Create Task #72 (10 USDC open) | `0xc008a714ac0c935edf275c0665960df32f940a05a49e9d9c8688370876c7b4c3` | ✅ |
| applyForTask(72) от faucet | `0xecbf2b6821cbbf1499ca98e084ae105f2b69b1af8b4ee9d627306e15bd86ef5f` | ✅ |
| selectAgent(72, 0) | `0x4950a057cf55d3d66fdb6d2340f2d85da09dc3cb3a32a92a56f06ecdc2d2f37c` | ✅ |
| submitResult(72) | `0x5f52d9ec94a2034db95ed62f6c397816a1dd6f5cb9146799a46638c8fd9f78ea` | ✅ |
| confirmDelivery(72, score=1) | `0xc5d1f0da26ce3b1747fce43e5d526aef23d65e9f9cbee04ff7d43c9ce94838a4` | ✅ агент получил 14.99 USDC |
| recordJobCompleted(agentId=7) XP | `0x254928653b8618b63525080a1981e5b961c7248b7e7de858f8b97bdf583003a6` | ✅ |

### 3. BUG НАЙДЕН — confirmDelivery overflow при score≥2
**Root cause**: `try IAgentRegistry.addXP(...) {} catch {}` в Solidity < 0.8.25 НЕ поглощает `Panic(0x11)` (arithmetic overflow). NEW Registry не имеет `addXP()`, и при определённых условиях возникает overflow.

**Фикс применён**: заменил все 4 `try addXP {} catch {}` на `agentRegistry.call(abi.encodeWithSelector(...))` — низкоуровневый call поглощает Panic.

**Деплой фикса**:
- Новая impl: `0xb2cEBdCd2e61fa82Fbf1e025E2e0dA3D5cBA5456`
- Deploy TX: `0xfcf2c65112df2c7e35030c3f8db4942d925783c12be589164b9dcd0bea753471`
- upgradeToAndCall TX: `0xd8f2271b8a92f80e0f52b230ff0125938a31998244e7a5775a4d9d82c5f3cca4` ✅

### 4. Faucet wallet зарегистрирован как агент #7
- `0x815DCEbB61dc64c2BD4cBDD97774Cccd45887409` — тестовый агент в NEW Registry

---

## 🔴 ОСТАЛОСЬ

### Критично: overflow при score=3 всё ещё воспроизводится
После upgrade прокси `Panic(0x11)` остаётся при score=3 на task #73 (статус: Delivered).
Overflow НЕ в addXP (уже low-level call). Возможные причины:
- Overflow в `score * 100` при передаче в call data (но 3*100=300 < uint32.max)  
- Overflow в MeritSBT `mintMerit` (проверено — работает, AlreadyRated уже для task 72)
- Overflow в `emit DeliveryConfirmed` (маловероятно)
- **Нужно**: `forge test --fork-url https://sepolia.base.org` для точной трассировки

### Task #73 ждёт confirmDelivery score=3
- Статус: Delivered ✅
- Client: `0x9061bF`, claimedBy: `0x815DCE` (agentId=7), reward=5 USDC

### Нужно обновить contracts.ts и ARCHITECTURE.md
AgentRegistry canonical адрес ИЗМЕНИЛСЯ:
- СТАРЫЙ (в файлах): `0xB5Cee4234D4770C241a09d228F757C6473408827` (9 agents, OLD)
- НОВЫЙ (Escrow использует): `0x98b19578289ded629a0992403942adeb2ff217c8` (7 agents, NEW)

Нужно:
1. Обновить `frontend/src/lib/contracts.ts` → `AgentRegistry: "0x98b19578289ded629a0992403942adeb2ff217c8"`
2. Обновить `ARCHITECTURE.md` → адреса контрактов, новый Escrow impl
3. Коммит + push

### Новый Escrow impl нужно верифицировать на Basescan
```bash
forge verify-contract 0xb2cEBdCd2e61fa82Fbf1e025E2e0dA3D5cBA5456 \
  src/MoltForgeEscrowV3.sol:MoltForgeEscrowV3 \
  --chain base-sepolia --etherscan-key $BASESCAN_API_KEY
```

---

## Актуальные адреса контрактов (Base Sepolia 84532)

| Contract | Address | Notes |
|----------|---------|-------|
| AgentRegistry OLD | `0xB5Cee4234D4770C241a09d228F757C6473408827` | 9 agents, фронт — УСТАРЕЛ |
| AgentRegistry NEW (canonical) | `0x98b19578289ded629a0992403942adeb2ff217c8` | Escrow → этот |
| AgentRegistry NEW impl | `0x5c34af4e8223bb6b214d2d176ebdc06a48c5c9ca` | UUPS |
| MoltForgeEscrow V3 proxy | `0x82fbec4af235312c5619d8268b599c5e02a8a16a` | 73 tasks |
| MoltForgeEscrow impl (pre-fix) | `0x6f16aa373a517e77e726fa5678eac662ba55ea2d` | старый |
| MoltForgeEscrow impl (post-fix) | `0xb2cEBdCd2e61fa82Fbf1e025E2e0dA3D5cBA5456` | текущий |
| MeritSBT (in Escrow) | `0x9FDb0B06B2058C567c1Ea2B125bFD622C78820D1` | mintMerit OK |
| MeritSBT NEW (Protocol Labs) | `0xe3C5b5a24fB481302C13E5e069ddD77E700C2113` | tier-based |
| MockUSDC | `0x74e5bf2eceb346d9113c97161b1077ba12515a82` | |

## Wallets
- Deployer/Client: `0x9061bF366221eC610144890dB619CEBe3F26DC5d`
- Faucet/Agent #7: `0x815DCEbB61dc64c2BD4cBDD97774Cccd45887409`
- PK deployer: `REDACTED_PRIVATE_KEY`
- PK faucet: `0x2590c45efe96127964ec62d9d4917f8d68dee1f98f0a93e35a3b2ee55c65077b`
