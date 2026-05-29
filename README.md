# GhostWhale AI: Autonomous Alpha Network

> **Institutional-Grade Multi-Agent Intelligence & On-Chain Audit Console on Mantle Network**  
> Built for the **Mantle Turing Test Hackathon 2026**

---

## 🌐 Live Contract Registry (Mantle Sepolia Testnet)

All core components are deployed and verified on the Mantle Sepolia Network:

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **AgentIdentity (ERC-8004)** | `0x51E2864C63E12D3EaE68874218C3558b4063c42B` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0x51E2864C63E12D3EaE68874218C3558b4063c42B) |
| **SignalRegistry** | `0xcDa86A272531e8640cD7F1a92c01839911B90bb0` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0xcDa86A272531e8640cD7F1a92c01839911B90bb0) |
| **AgentCouncil** | `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9) |
| **TradeHistory** | `0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE) |
| **ReputationManager** | `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8) |
| **TransparencyLedger** | `0x5bE26527e817998A7206475496fDE1E68957c5A6` | [Explorer Link](https://explorer.sepolia.mantle.xyz/address/0x5bE26527e817998A7206475496fDE1E68957c5A6) |

---

## 🛠️ System Architecture

GhostWhale AI runs an autonomous pipeline processing events from block generation down to frontend notifications and smart-contract state updates.

```
+-----------------------------------------------------------------------------+
|                               MANTLE BLOCKCHAIN                             |
|                                                                             |
|  [Whale Ingestion]                     [Consensus Auditing]                 |
|  * Track whale swaps/transfers         * Store consensus hashes             |
|  * Scan Merchant Moe LP events         * Update ERC-8004 Agent Reputation   |
+-------------------▲---------------------------------▲-----------------------+
                    │ JSON-RPC                        │ w3.eth.send_raw_transaction
                    │                                 │
+-------------------▼--------------------------------─┴────────────────-------+
|                                BACKEND CORE                                 |
|                                                                             |
|  +-----------------------+      Debate      +----------------------------+  |
|  |     Block Scanner     | ---------------> |    Multi-Agent Council     |  |
|  | (whale_tracker.py &   |  (Transaction    | (WhaleHunter, LiquidityAI, |  |
|  |  liquidity_scanner.py)|   Metadata)      | Momentum, RiskGuard, Macro)|  |
|  +-----------------------+                  +-------------┬--------------+  |
|                                                           │                 |
|                                                           ▼ consensus results
|  +-----------------------+   SSE Stream     +----------------------------+  |
|  |  FastAPI Server (SSE)  | <--------------- |    Risk & Trade Engines    |  |
|  | (main.py / /events)   |                  | (risk_engine / executor)   |  |
|  +-----------┬-----------+                  +-------------┬--------------+  |
|              │                                            │                 |
|              │ Server-Sent Events                         ▼ sqlite / pg     |
|              │                              +----------------------------+  |
|              │                              |        Ecosystem DB        |  |
|              │                              |       (ghostwhale.db)      |  |
|              │                              +----------------------------+  |
+--------------┼--------------------------------------------------------------+
               │
               ▼ /api/events
+-----------------------------------------------------------------------------+
|                             CYBERPUNK FRONTEND HUD                          |
|                                                                             |
|  * Rotating sonargrid (NetworkMap)          * Active debate details         |
|  * Live transaction and LP scanner feeds    * ERC-8004 performance graph    |
+-----------------------------------------------------------------------------+
```

---

## 💡 Core Features

1. **Whale Tracker**: Scans Mantle blocks for large token movements exceeding `$50,000` (or native `MNT` movements) and computes wallet risk/activity scores.
2. **Liquidity Scanner**: Watches pool events on Merchant Moe and Agni Finance, capturing LP additions (`lp_add`) and removals (`lp_remove`) to detect rug-pull signals or deep liquidity additions.
3. **Multi-Agent Council**: Ingested transactions are submitted to **five specialized agents** who vote on market direction. The orchestrator computes a weighted consensus score to execute or skip a trade.
4. **On-Chain Audit trails**: Integrates a custom suite of Solidity smart contracts deployed to Mantle Sepolia, enabling tamper-proof recording of agent voting patterns, trades, and reputation.
5. **Dynamic SVG ERC-8004 NFT**: Binds the council state to an on-chain NFT badge that recalculates win rates and alters its SVG design as trades settle.
6. **Cyberpunk HUD**: Futuristic React frontend built with vanilla HSL Huds, circular holograms, ambient alert systems, Threat Detection overlays, and Stealth Mode controls.

---

## 🚀 Quick Start

Ensure you have Node.js 18+, Python 3.10+, and `pnpm` installed.

### 1. Set Up Environment Variables
Copy the example configuration:
```bash
cp .env.example .env
```
*(By default, `MOCK_MODE=true` is set. This enables full paper trading and simulated contract integration out of the box without requiring private keys or gas).*

### 2. Configure Python & Local Database
```bash
# Install core requirements
pip install -r requirements.txt

# Install Solidity compiler bindings
pip install py-solc-x

# Initialize and seed database
python backend/seed_demo.py
```

### 3. Deploy/Verify Smart Contracts
To test compile and deploy the smart contracts (either in mock mode or using a testnet `PRIVATE_KEY`):
```bash
python scripts/deploy_all_contracts.py
```

### 4. Run Backend & Frontend Servers

**Terminal 1: Start FastAPI Backend**
```bash
python backend/main.py
```
*(Runs on `http://localhost:8000`. You can inspect APIs at `/docs`)*

**Terminal 2: Start React Frontend**
```bash
cd frontend
pnpm install
pnpm dev
```
*(Runs on `http://localhost:5173`)*

---

## 📊 Documentation Index

For detailed specifications, review the separate guides:
* **[System Architecture](file:///C:/Users/USER/./.gemini/antigravity/worktrees/ghostwhale-ai/debug-real-tx-tracking/ARCHITECTURE.md)**: Details on agents, database schema, and consensus calculations.
* **[Deployment Manual](file:///C:/Users/USER/./.gemini/antigravity/worktrees/ghostwhale-ai/debug-real-tx-tracking/DEPLOYMENT.md)**: In-depth setup, dependency installation, and network configurations.
* **[Judges Demo Guide](file:///C:/Users/USER/./.gemini/antigravity/worktrees/ghostwhale-ai/debug-real-tx-tracking/DEMO_SCRIPT.md)**: Walkthrough script for hackathon reviewers.
* **[Pitch Deck Framework](file:///C:/Users/USER/./.gemini/antigravity/worktrees/ghostwhale-ai/debug-real-tx-tracking/PITCH_DECK.md)**: Project value proposition and market strategy slide copy.
* **[Video Script](file:///C:/Users/USER/./.gemini/antigravity/worktrees/ghostwhale-ai/debug-real-tx-tracking/VIDEO_SCRIPT.md)**: Layout storyboard for the 3-minute project demo recording.
