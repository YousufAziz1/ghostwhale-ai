# GhostWhale AI: Autonomous Alpha Network — Live Demo Guide

This script guides hackathon judges through a 3-minute evaluation of the **GhostWhale AI** autonomous multi-agent alpha network.

---

## Part 1: Setting up the Demo Sandbox (1 Minute)

Ensure the SQLite database has been freshly seeded and both servers are active:

1. **Seed the database**:
   ```bash
   python backend/seed_demo.py
   ```
2. **Boot the backend**:
   ```bash
   python backend/main.py
   ```
3. **Launch the frontend**:
   ```bash
   cd frontend && pnpm dev
   ```
4. **Open the browser**: Navigate to `http://localhost:5173`.

---

## Part 2: Cyberpunk HUD & Terminal Walkthrough (1 Minute)

### Key Visuals & Interactions:
1. **Circular Holographic Radar (Center-Top)**:
   * Notice the rotating sonar line sweeping the grid.
   * Red/blue dots materialize as blocks are mined. These represent mock transaction locations mapped onto a polar coordinate system representing the Mantle AMM liquidity pairs.
2. **The 3-Column Layout**:
   * **Left Column**: System control console. Displays the **Agent Registry Metadata** (ERC-8004 contract specs), the **Ecosystem Health Meter** (Live Mantle RPC block tracking), and the **Telemetry Metrics Gauge** (Cumulative PnL graph and statistics).
   * **Center Column**: Live Radar and the **Whale Event Feed** showing real-time token movements above $50k.
   * **Right Column**: **Liquidity Scanner** (live LP additions/removals) and the **Multi-Agent Council Debate Cores**.
3. **HUD Modes (Interactive Buttons)**:
   * Press **THREAT DETECT** in the top header. The entire UI shifts to neon red with alerts pulsing to indicate extreme wallet transaction volatility.
   * Press **STEALTH MODE** to dim the colors into an ultra-dark stealth gray terminal, hiding telemetry to run silent search tasks.

---

## Part 3: The Multi-Agent Council Debate in Action (1 Minute)

### Triggering a Mock Council Debate:
The backend generates new mock transactions and votes dynamically to feed the SSE stream. Let's trace how a trade signal is synthesized:

1. **Watch the Whale Event Feed**:
   * When a transaction appears (e.g., wallet `0x48f...` transferring `$64,250` of `MNT`), the system schedules a council session.
2. **Analyze the Council Debate Cores (Right Column)**:
   * Look at the 5 agent panels updating:
     * **WhaleHunter AI**: Analyzes the wallet reputation.
     * **LiquidityAI**: Scans pool depth to check if swap slippage is acceptable.
     * **MomentumAI**: Inspects volume multiplier indexes.
     * **RiskGuard AI**: Inspects for cyclic loops (wash trading).
     * **MacroAI**: Determines if gas indexes permit profitable trade settlement.
   * Read the agent reasoning strings. They are generated in plain English: *"Apex tier wallet has 78% win rate; initiating momentum BUY."*
3. **Consensus Resolution**:
   * The orchestrator runs the weighted consensus formula.
   * If approved, the consensus gauge prints `🟢 BUY` or `🔴 SELL`, and writes the signal metadata hash directly to the local audit database (or on-chain via `SignalRegistry.sol` if mock mode is turned off).

---

## Part 4: On-Chain Audit & Verification (30 Seconds)

1. **Inspect Agent Identity**:
   * The left panel displays the `Agent NFT Contract` address (`0x51E2864C63E12D3E...`).
   * This is a live ERC-8004 NFT contract. It manages the agent reputation index (currently sitting at `750/1000`) and the overall win rate (currently `75%`).
2. **Settled Log Verification**:
   * Scroll down the left panel to review past executed mock trades.
   * Each entry contains the entry/exit prices, execution direction, and a simulated profit/loss value (e.g. `+$254.10`).
   * This demonstrates a closed loop: detection $\rightarrow$ debate $\rightarrow$ signal registration $\rightarrow$ trade execution $\rightarrow$ P&L settlement $\rightarrow$ reputation adjustment.
