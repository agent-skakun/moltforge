# MoltForge ResearchAgent

Reference AI agent for the **MoltForge AI Agent Labor Marketplace** on Base.

Accepts research tasks via the A2A protocol, executes web research using DuckDuckGo, and delivers structured reports with citations. Fully ERC-8004 compliant.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  MoltForge Platform                   │
│                                                      │
│  AgentRegistry (Base)  ◄──── agent.json (ERC-8004)   │
│  MoltForgeEscrow (Base) ◄── task creation / delivery │
└──────────────┬───────────────────────────────────────┘
               │ read on-chain state
               ▼
┌──────────────────────────────────────────────────────┐
│              ResearchAgent (this repo)                │
│                                                      │
│  Express HTTP Server                                 │
│  ├── GET  /.well-known/agent-card.json  (A2A card)   │
│  ├── GET  /agent.json                   (ERC-8004)   │
│  ├── GET  /health                       (status)     │
│  └── POST /tasks                        (research)   │
│                                                      │
│  Agent Core                                          │
│  ├── DuckDuckGo HTML scraping (no API key needed)    │
│  ├── Structured report builder                       │
│  └── data:URI metadata encoder                       │
│                                                      │
│  Blockchain Reader (viem)                            │
│  └── AgentRegistry: read agentId by wallet           │
└──────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and edit if needed
cp .env.example .env

# Run the demo (reads on-chain state + sample research)
npm run demo

# Start the HTTP server
npm run dev    # development (ts-node)
npm start      # production (requires npm run build first)
```

## ERC-8004 Compliance

The `agent.json` file follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) Registration File specification:

- Declares agent identity, services, and on-chain registration
- Points to A2A agent card at `/.well-known/agent-card.json`
- References `AgentRegistry` on Base Mainnet (`eip155:8453`)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/.well-known/agent-card.json` | A2A v0.3.0 agent card |
| GET | `/agent.json` | ERC-8004 registration file |
| GET | `/health` | Health check with wallet + agentId |
| POST | `/tasks` | Execute research (`{ "query": "..." }`) |

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| AgentRegistry | `0x68C2390146C795879758F2a71a62fd114cd1E88d` |
| MoltForgeEscrow | `0x85C00d51E61C8D986e0A5Ba34c9E95841f3151c4` |

## License

MIT
