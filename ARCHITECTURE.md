# GhostWhale AI: Autonomous Alpha Network — System Architecture

This document details the institutional-grade architecture of the **GhostWhale AI Autonomous Alpha Network** on the Mantle blockchain.

---

## 1. System Topology Overview

GhostWhale AI functions as a complete decentralized agent platform. It continuously ingests on-chain events from the Mantle blockchain, submits them to a Multi-Agent Council for consensus voting, logs results to a suite of audit contracts, executes trades, and streams live telemetry to a cyberpunk dashboard.

```
                  ┌─────────────────────────────────────┐
                  │           Mantle Blockchain         │
                  └──────────┬───────────────────▲──────┘
                             │                   │
               Whale Events  │                   │ On-Chain Audits &
          & LP Mint/Burns    ▼                   │ NFT Updates
                  ┌──────────┴───────────────────┴──────┐
                  │          Ingestion & Sync           │
                  │   whale_tracker.py  / lp_scanner   │
                  └──────────┬──────────────────────────┘
                             │
                             ▼
                  ┌─────────────────────────────────────┐
                  │       Multi-Agent Council           │
                  │ (WhaleHunter, Liquidity, Momentum,  │
                  │     RiskGuard, MacroAI Council)     │
                  └──────────┬──────────────────────────┘
                             │
                             ▼ Consensus Check
                  ┌─────────────────────────────────────┐
                  │      Risk & Validation Engine       │
                  │          risk_engine.py             │
                  └──────────┬──────────────────────────┘
                             │
                             ▼ Approved Signals
                  ┌─────────────────────────────────────┐
                  │            Trade Engine             │
                  │    trade_executor.py / P&L Sync     │
                  └──────────┬──────────────────────────┘
                             │
                             ├──────────────────────────┐
                             ▼                          ▼
                  ┌──────────────────┐        ┌──────────────────┐
                  │  FastAPI (REST)  │        │   SQLite Local   │
                  │  & SSE Streams   │        │     Database     │
                  └──────────┬───────┘        └──────────────────┘
                             │
                             ▼ Server-Sent Events (SSE)
                  ┌─────────────────────────────────────┐
                  │      Cyberpunk Terminal HUD         │
                  │     (React, Vite, Tailored CSS)     │
                  └─────────────────────────────────────┘
```

---

## 2. Multi-Agent Council & Consensus Engine

Rather than relying on a single neural network or heuristic model, GhostWhale AI delegates decisions to a council of **five specialized AI agents**, each maintaining their own independent voting rules, risk tolerance, and on-chain identity.

### Council Members

| Agent Name | Specialization / Focus | Voting Logic | Influence Weight |
| :--- | :--- | :--- | :--- |
| **WhaleHunter AI** | Smart-money wallet tracking | Analyzes historical win-rate of the initiating wallet, smart money tier (Apex, High, Medium), and transaction magnitude. | 30% |
| **LiquidityAI** | Automated market maker (AMM) depth | Scans pair pools on Merchant Moe and Agni Finance. Rejects buy signals if pools exhibit recent LP withdrawals or high slippage. | 20% |
| **MomentumAI** | Price Action & Volume spikes | Uses short-term EMA/MACD crossovers, volume multiplier alerts, and RSI indicators to ride token momentum. | 20% |
| **RiskGuard AI** | Wash trading & Sybil heuristics | Evaluates the source of funding, wallet age, circular token transfers, and blacklisted counter-parties. | 20% |
| **MacroAI** | Network telemetry & Gas index | Assesses general Mantle chain gas trends, volatility indexes, and macro token flow velocity. | 10% |

### Consensus Scoring Protocol

When a whale transaction triggers the system, each agent evaluates the data and submits a vote: `(Direction, Confidence, Reasoning)`.
* **Direction**: `BUY`, `SELL`, or `HOLD`.
* **Confidence**: A floating point score from `0.00` to `1.00`.
* **Reasoning**: A plain-English sentence justifying the vote.

The Council Orchestrator (`agent_council.py`) compiles the votes. The consensus is computed using a weighted score formula:

$$\text{Score}(\text{Dir}) = \sum_{a \in \text{Agents}} \text{Vote}_{a}(\text{Dir}) \times \text{Weight}_a \times \text{Confidence}_a$$

* The direction with the highest weighted score is selected.
* If the consensus direction is `HOLD` or the winning consensus confidence is below the `MIN_SIGNAL_CONFIDENCE` threshold (default 65%), the signal is logged as `HOLD` (skipped) and not executed.
* If a trade is executed, agent reputations are updated on-chain depending on whether the trade settled in profit or loss.

---

## 3. Smart Contract Architecture

Every decision, debate, execution, and reputation shift is cryptographically secured and stored on the Mantle network. The contract architecture is modular and split into six core contracts:

```
                  ┌──────────────────────┐
                  │    AgentIdentity     │ (ERC-8004 Metadata & Badge)
                  └──────────▲───────────┘
                             │ Updates
                  ┌──────────┴───────────┐
                  │  ReputationManager   │ (Calculates agent performance)
                  └──────────▲───────────┘
                             │
                             ├───────────────┬───────────────┐
                             │               │               │
                  ┌──────────┴───────┐ ┌─────┴────────┐ ┌────┴────────────────┐
                  │  SignalRegistry  │ │ AgentCouncil │ │     TradeHistory    │
                  │ (Signal hashes)  │ │ (Agent votes)│ │ (PnL & Settlements) │
                  └──────────▲───────┘ └─────▲────────┘ └────▲────────────────┘
                             │               │               │
                             └───────────────┼───────────────┘
                                             │ Logs everything
                                  ┌──────────┴───────────┐
                                  │  TransparencyLedger  │ (Ecosystem Auditor)
                                  └──────────────────────┘
```

1. **`AgentIdentity.sol`**: An ERC-8004 compliant Non-Fungible Token representing the AI Agent Council's identity. Stores on-chain win rates, P&L in basis points, and generates an on-chain SVG representation representing agent status.
2. **`SignalRegistry.sol`**: Acts as a permanent registry of all signals generated. Stores the cryptographic hash of the reasoning text to prevent tampering.
3. **`AgentCouncil.sol`**: Logs individual council member votes and reasonings for each signal.
4. **`TradeHistory.sol`**: Archives entry and exit prices, execution transaction hashes, and trade settlement parameters.
5. **`ReputationManager.sol`**: Calculates updates to the reputation scores (0–1000) and risk factors dynamically when trades settle.
6. **`TransparencyLedger.sol`**: The centralized portal auditing interactions across all other contracts.

---

## 4. Database Schema (SQLite / Postgres)

To facilitate rapid, zero-setup hackathon evaluation, GhostWhale AI defaults to a fully-seeded **SQLite** database (`ghostwhale.db`), but uses raw SQL structures designed to map directly to institutional **PostgreSQL** databases:

### Table Relationships

* **`whale_events`**: Raw whale movements scraped from blocks.
  * Fields: `id`, `tx_hash` (Primary Key), `from_wallet`, `to_wallet`, `token`, `amount_usd`, `action`, `block_number`, `wallet_score`, `timestamp`.
* **`signals`**: Signals generated by the Council.
  * Fields: `id`, `signal_id` (Primary Key), `token`, `direction`, `confidence`, `reasoning`, `urgency`, `suggested_size_usd`, `whale_event_tx` (FK -> `whale_events.tx_hash`), `acted_on`, `timestamp`.
* **`votes`**: Individual agent opinions.
  * Fields: `id`, `signal_id` (FK -> `signals.signal_id`), `agent_name`, `direction`, `confidence`, `reasoning`.
* **`trades`**: Execution states and financial P&L.
  * Fields: `id`, `signal_id` (FK -> `signals.signal_id`), `status`, `tx_hash`, `token`, `direction`, `entry_price`, `exit_price`, `size_usd`, `pnl_usd`, `pnl_pct`, `settled`, `timestamp`, `settled_at`.
* **`agents`**: Active profiles of the 5 council instances.
  * Fields: `name` (Primary Key), `role`, `description`, `reputation_score`, `risk_score`, `active`.
* **`liquidity_events`**: Pool telemetry.
  * Fields: `id`, `tx_hash`, `pool`, `token0`, `token1`, `action`, `amount_usd`, `block_number`, `timestamp`.
