"""
GhostWhale AI — FastAPI Backend

Serves REST API to the React frontend and runs the whale scanning loop.
All background tasks start on server startup.
"""

import sys
import os
# Ensure the backend directory is always in sys.path,
# no matter where the script is invoked from.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import API_HOST, API_PORT, LOG_LEVEL, MIN_SIGNAL_CONFIDENCE
from database import (
    init_db,
    get_recent_signals,
    get_agent_stats,
    get_recent_whale_events,
    get_recent_trades,
    get_pnl_timeseries,
)
from whale_tracker import continuous_scan, WhaleEvent, check_connection
from signal_engine import (
    generate_signal,
    score_wallet,
    analyze_market_context,
    signal_to_dict,
)
from trade_executor import execute_trade, run_mock_settler
from telegram_bot import send_signal_alert
from agent_identity import get_agent_nft_data
from database import save_signal, mark_signal_acted_on

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Agent Loop ───────────────────────────────────────────────────────────────

async def handle_whale_event(event: WhaleEvent) -> None:
    """
    Called for every new whale event detected by the scanner.

    Pipeline:
      1. Score the source wallet
      2. Fetch market context for the token
      3. Generate a trade signal
      4. Save signal to DB
      5. Execute trade if confidence is high enough
      6. Send Telegram alert for high-confidence signals
    """
    logger.info(
        "🐋 Whale event: %s %s $%.0f (%s)",
        event.action.upper(), event.token, event.amount_usd, event.tx_hash[:10]
    )

    # 1. Score the wallet (use empty history if RPC call fails — still gives base score)
    try:
        from whale_tracker import get_wallet_history
        history = await get_wallet_history(event.from_wallet, limit=20)
    except Exception:
        history = []

    wallet_score = await score_wallet(event.from_wallet, history)
    event.wallet_score = wallet_score

    # 2. Market context
    market_ctx = await analyze_market_context(event.token)

    # 3. Generate signal
    signal = generate_signal(event, wallet_score, market_ctx)
    logger.info(
        "📊 Signal: %s %s | confidence=%.2f | urgency=%s",
        signal.direction, signal.token, signal.confidence, signal.urgency,
    )

    # 4. Save to DB
    save_signal(signal_to_dict(signal))

    # 5. Execute trade
    if signal.confidence >= MIN_SIGNAL_CONFIDENCE:
        result = execute_trade(signal)
        if result.status not in ("skipped", "failed"):
            mark_signal_acted_on(signal.signal_id)
            logger.info("✅ Trade %s: %s %s | entry=$%.4f", result.status, result.direction, result.token, result.entry_price)

    # 6. Telegram alert
    try:
        await send_signal_alert(signal)
    except Exception as tg_exc:
        logger.warning("Telegram alert failed: %s", tg_exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background tasks on server startup, clean up on shutdown."""
    init_db()
    logger.info("✅ Database initialised")

    # Check RPC connectivity
    conn = check_connection()
    if conn["connected"]:
        logger.info("✅ Mantle RPC connected — chain_id=%s block=%s", conn["chain_id"], conn["latest_block"])
    else:
        logger.warning("⚠️  Mantle RPC unreachable: %s", conn.get("error"))

    # Start background tasks
    scan_task   = asyncio.create_task(continuous_scan(handle_whale_event))
    settle_task = asyncio.create_task(run_mock_settler())

    logger.info("🚀 GhostWhale AI agent loop started")
    yield

    # Graceful shutdown
    scan_task.cancel()
    settle_task.cancel()
    logger.info("GhostWhale shutting down")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GhostWhale AI",
    description="Autonomous AI trading agent for Mantle Network",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Connectivity + status check."""
    conn = check_connection()
    return {
        "status": "GhostWhale is hunting 🐋",
        "rpc": conn,
        "version": "1.0.0",
    }


@app.get("/api/signals")
async def get_signals(limit: int = Query(default=20, ge=1, le=100)):
    """Returns recent AI signals with reasoning, joined with whale event data."""
    return get_recent_signals(limit)


@app.get("/api/whale-events")
async def get_whale_events(limit: int = Query(default=50, ge=1, le=200)):
    """Returns recent whale events detected on Mantle."""
    return get_recent_whale_events(limit)


@app.get("/api/trades")
async def get_trades(limit: int = Query(default=50, ge=1, le=200)):
    """Returns recent trade executions with P&L data."""
    return get_recent_trades(limit)


@app.get("/api/stats")
async def get_stats():
    """Returns agent performance stats: win rate, total P&L, signal count."""
    return get_agent_stats()


@app.get("/api/pnl-timeseries")
async def get_pnl_timeseries_endpoint():
    """Returns cumulative P&L timeseries for the chart."""
    return get_pnl_timeseries()


@app.get("/api/agent-identity")
async def get_identity():
    """Returns ERC-8004 agent identity and reputation data."""
    return get_agent_nft_data()


@app.get("/api/rpc-status")
async def get_rpc_status():
    """Quick RPC connectivity check."""
    return check_connection()


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,
        log_level=LOG_LEVEL.lower(),
    )
