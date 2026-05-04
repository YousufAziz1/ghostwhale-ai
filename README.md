# GhostWhale AI

> Autonomous AI trading agent for Mantle Network — Turing Test Hackathon 2026

GhostWhale AI tracks large wallet movements on Mantle, scores them with a multi-factor AI engine, generates transparent trade signals with public reasoning, and executes (or mock-executes) trades on Merchant Moe — all displayed on a live cyberpunk dashboard with an ERC-8004 on-chain identity.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mantle Network                          │
│   whale_tracker.py ──► signal_engine.py ──► trade_executor │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│      database.py          telegram_bot         MockP&L      │
│         │                                                   │
│         └──────── main.py (FastAPI REST API) ───────────────┤
│                              │                              │
│               React Dashboard (Vite + Tailwind)            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| File | Role |
|---|---|
| `backend/whale_tracker.py` | Polls Mantle RPC every 15s, detects ERC-20 Transfer events above $50K threshold |
| `backend/signal_engine.py` | Scores wallets, analyses market context, generates BUY/SELL/HOLD signals with plain-English reasoning |
| `backend/trade_executor.py` | MOCK mode: logs simulated trade, settles P&L after 30 min. REAL mode: Merchant Moe swap |
| `backend/agent_identity.py` | ERC-8004 agent metadata merged with live DB stats |
| `backend/database.py` | SQLite: whale_events, signals, trades, price_cache tables |
| `backend/main.py` | FastAPI server: background scanner + REST API |
| `contracts/AgentIdentity.sol` | ERC-8004 NFT with on-chain reputation, on-chain SVG token URI |
| `frontend/src/App.tsx` | 3-column dashboard, polls backend, ambient cyberpunk styling |

---

## Quick Start

### Backend

```bash
# 1. Install Python deps
pip install -r requirements.txt

# 2. Copy env file
cp .env.example .env
# Edit .env — at minimum, MOCK_MODE=true (default)

# 3. Run backend
cd backend
python main.py
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

### Frontend

```bash
cd frontend
pnpm install    # already done
pnpm dev        # → http://localhost:5173
```

### Deploy Agent NFT (optional, Mantle Testnet)

```bash
pip install py-solc-x
# Set PRIVATE_KEY in .env (testnet wallet)
python scripts/deploy_agent_nft.py
# Contract address written to .env automatically
```

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | RPC status + version |
| `GET /api/signals?limit=20` | Recent AI trade signals with reasoning |
| `GET /api/whale-events?limit=50` | Raw whale movements detected |
| `GET /api/trades?limit=50` | Trade executions with P&L |
| `GET /api/stats` | Agent performance: win rate, P&L, signal count |
| `GET /api/pnl-timeseries` | Cumulative P&L for chart |
| `GET /api/agent-identity` | ERC-8004 identity + reputation |

---

## Signal Engine

The AI scoring model uses a weighted confidence formula:

```
confidence = wallet_score  × 0.40
           + volume_spike  × 0.25
           + price_trend   × 0.20
           + whale_cluster × 0.15
```

**Direction rules (in priority order):**
1. `wallet_score > 0.70` AND `action == buy` AND `volume > 1.5×` → **BUY**
2. `wallet_score > 0.70` AND `action == sell` AND `price_trend < -2%` → **SELL**
3. `3+ whale buys` same token in 1h → **MOMENTUM BUY**
4. `lp_remove` AND `price_trend < -1%` → **DUMP WARNING SELL**
5. `volume > 2.5×` AND `price_trend > 0` → **BUY**
6. Otherwise → **HOLD**

All reasoning is generated as plain English and shown publicly on the dashboard. No black box.

---

## ERC-8004 Agent Identity

The `contracts/AgentIdentity.sol` contract:
- Mints a unique NFT per AI agent
- Stores `totalSignals`, `winningSignals`, `totalPnLBps` on-chain
- Computes `reputationScore` (0–1000) from win rate + P&L
- Serves a fully on-chain SVG token URI (no IPFS dependency)
- Updated by the backend operator after each settled trade

---

## Demo Script (Judges)

1. **"GhostWhale AI is live on Mantle right now."**
2. Show **WhaleFeed** — real whale movement appearing in real-time
3. Show **SignalCard** — AI explains WHY it generated a BUY signal
4. Show **Telegram** — alert arrives live on screen
5. Show **DecisionLog** — every past decision is publicly visible, with P&L
6. Show **AgentIdentity** — ERC-8004 NFT badge with live reputation score
7. Show **PnL Chart** — mock P&L is positive and growing
8. **"This is not a black box. GhostWhale shows every thought it has — on-chain, in real-time."**

---

## Hackathon Tracks

- ✅ **AI Trading & Strategy** — autonomous signal generation + execution on Mantle
- ✅ **AI Alpha & Data** — on-chain whale intelligence + transparent decision log

---

*GhostWhale AI — Built for Turing Test Hackathon 2026 | Mantle Network*
