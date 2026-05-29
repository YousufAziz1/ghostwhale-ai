# GhostWhale AI: Autonomous Alpha Network — Deployment Guide

This document describes how to deploy, configure, and run the complete GhostWhale AI system (contracts, backend server, and frontend dashboard) locally or to production.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your system:
* **Python**: Version `3.10` or higher.
* **Node.js**: Version `18` or higher.
* **pnpm**: Fast, disk-space efficient package manager (for frontend).
* **Git**: To verify open-source codebase revisions.

---

## 2. Installation Steps

### Step A: Clone the Repository & Configure Python Dependencies
1. Navigate to the repository root directory:
   ```bash
   pip install -r requirements.txt
   ```
2. Install `py-solc-x` (required for Solidity compilation if compiling on-the-fly):
   ```bash
   pip install py-solc-x
   ```

### Step B: Install Frontend Dependencies
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   pnpm install
   ```
2. Return to the root folder:
   ```bash
   cd ..
   ```

---

## 3. Configuration (`.env`)

1. Copy the example environment template into `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure the core variables:
   * **`MOCK_MODE`**: Set to `true` (default) for simulated paper trading and local SQLite audit logs, or `false` to attempt real transactions on-chain.
   * **`PRIVATE_KEY`**: (Required if `MOCK_MODE=false`) The hex private key of the deployer/operator account.
   * **`MANTLE_RPC`**: JSON-RPC endpoint for Mantle Mainnet.
   * **`MANTLE_TESTNET_RPC`**: JSON-RPC endpoint for Mantle Testnet (Sepolia).

If no `PRIVATE_KEY` is provided, the deployment script runs in **Dry Run mode**, generating mock contract addresses to allow full local simulation.

---

## 4. Contract Compilation & Deployment

GhostWhale AI comes with a single orchestrator script to compile and deploy the entire contract suite.

1. Run the deploy script from the root workspace directory:
   ```bash
   python scripts/deploy_all_contracts.py
   ```
2. The script will:
   * Check for a `PRIVATE_KEY` in `.env`.
   * **Simulated Mode**: Write mock contract addresses to `.env` if no key exists.
   * **Live Mode**: Download solc compiler `0.8.24`, compile all `.sol` files in the `contracts/` directory using standard compiler optimization, sign deploy transactions, deploy them sequentially to the Mantle testnet, and write the verified contract addresses directly to `.env`.

---

## 5. Seeding & Database Ingestion

To populate your dashboard immediately with historic whale alerts, votes, trades, and reputation analytics, run the demo seeder:

```bash
python backend/seed_demo.py
```

This clears any old tables in `ghostwhale.db`, seeds 15 mock whale events, 5 multi-agent voting debates, and 8 settled trades with complete P&L telemetry.

---

## 6. Running the Platform

To view the dashboard and run the autonomous council, launch both the backend and frontend servers:

### A. Launch Backend Server
From the root workspace directory:
```bash
python backend/main.py
```
* The backend runs on `http://localhost:8000`.
* FastAPI auto-documents endpoints at `http://localhost:8000/docs` (Swagger UI).
* Scanners start immediately in the background, polling Mantle RPC and streaming alerts.

### B. Launch Frontend Dashboard
From the `frontend/` directory:
```bash
cd frontend
pnpm dev
```
* The dashboard opens at `http://localhost:5173`.
* It connects to the backend API and opens a Server-Sent Events (SSE) socket for real-time flashes.

---

## 7. Operational Verification

To confirm the network is healthy:
1. Visit `http://localhost:8000/api/health` in your browser. Verify `rpc.connected` is `true`.
2. Inspect the dashboard console logs (F12) to verify a successful connection to the SSE stream at `/api/events`.
3. Toggle "Threat Mode" on the dashboard to test neon red HUD overlays and circular holographic radar sweeps.
