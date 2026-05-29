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

async def run_liquidity_scanner() -> None:
    """Continuous polling loop for pool liquidity shifts on Mantle."""
    logger.info("💧 GhostWhale liquidity scanner active")
    from liquidity_scanner import scan_liquidity_movements
    from whale_tracker import w3
    from notification_engine import broadcast_event

    try:
        last_scanned_block = w3.eth.block_number - 100
    except Exception:
        last_scanned_block = 0

    while True:
        try:
            latest = w3.eth.block_number - 3
            if latest > last_scanned_block:
                events = await scan_liquidity_movements(last_scanned_block + 1, latest)
                for e in events:
                    broadcast_event("liquidity_event", e)
                last_scanned_block = latest
        except Exception as exc:
            logger.error("Liquidity scanner loop error: %s", exc)
        await asyncio.sleep(15)


async def handle_whale_event(event: WhaleEvent) -> None:
    """
    Called for every new whale event detected by the scanner.
    """
    from notification_engine import broadcast_event

    logger.info(
        "🐋 Whale event: %s %s $%.0f (%s)",
        event.action.upper(), event.token, event.amount_usd, event.tx_hash[:10]
    )

    # Broadcast raw whale event
    broadcast_event("whale_event", {
        "tx_hash": event.tx_hash,
        "from_wallet": event.from_wallet,
        "to_wallet": event.to_wallet,
        "token": event.token,
        "amount_usd": event.amount_usd,
        "action": event.action,
        "block_number": event.block_number,
        "timestamp": event.timestamp.isoformat()
    })

    # 1. Score the wallet
    try:
        from whale_tracker import get_wallet_history
        history = await get_wallet_history(event.from_wallet, limit=20)
    except Exception:
        history = []

    wallet_score = await score_wallet(event.from_wallet, history)
    event.wallet_score = wallet_score

    # 2. Market context
    market_ctx = await analyze_market_context(event.token)

    # 3. Generate signal (debated by council)
    signal = await generate_signal(event, wallet_score, market_ctx)
    logger.info(
        "📊 Signal: %s %s | confidence=%.2f | urgency=%s",
        signal.direction, signal.token, signal.confidence, signal.urgency,
    )

    # 4. Save to DB
    sig_dict = signal_to_dict(signal)
    save_signal(sig_dict)

    # Broadcast generated signal (includes votes details)
    from database import get_votes_for_signal
    sig_dict["votes"] = get_votes_for_signal(signal.signal_id)
    broadcast_event("signal", sig_dict)

    # 5. Execute trade
    if signal.confidence >= MIN_SIGNAL_CONFIDENCE:
        result = execute_trade(signal)
        if result.status not in ("skipped", "failed"):
            mark_signal_acted_on(signal.signal_id)
            logger.info("✅ Trade %s: %s %s | entry=$%.4f", result.status, result.direction, result.token, result.entry_price)
            # Broadcast executed trade
            broadcast_event("trade", {
                "signal_id": result.signal_id,
                "status": result.status,
                "token": result.token,
                "direction": result.direction,
                "entry_price": result.entry_price,
                "size_usd": result.size_usd,
                "mock": result.mock,
                "timestamp": datetime.utcnow().isoformat()
            })

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
    liq_task    = asyncio.create_task(run_liquidity_scanner())
    settle_task = asyncio.create_task(run_mock_settler())

    logger.info("🚀 GhostWhale AI Autonomous Alpha Network started")
    yield

    # Graceful shutdown
    scan_task.cancel()
    liq_task.cancel()
    settle_task.cancel()
    logger.info("GhostWhale shutting down")


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="GhostWhale AI: Autonomous Alpha Network",
    description="Institutional-grade autonomous AI multi-agent council for Mantle",
    version="2.0.0",
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
        "status": "GhostWhale Council is scanning the deep 🐋",
        "rpc": conn,
        "version": "2.0.0",
    }


@app.get("/api/signals")
async def get_signals(limit: int = Query(default=20, ge=1, le=100)):
    """Returns recent AI signals with reasoning, joined with whale event data."""
    signals = get_recent_signals(limit)
    # Join votes for each signal
    from database import get_votes_for_signal
    for sig in signals:
        sig["votes"] = get_votes_for_signal(sig["signal_id"])
    return signals


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


# ─── New Multi-Agent Council & Liquidity Endpoints ────────────────────────────

@app.get("/api/council/agents")
async def get_council_agents():
    """Returns list of registered council agents and their live reputation statistics."""
    from database import get_agents
    return get_agents()


@app.get("/api/council/votes")
async def get_council_votes(signal_id: str):
    """Returns votes and detailed reasoning cast for a specific signal ID."""
    from database import get_votes_for_signal
    return get_votes_for_signal(signal_id)


@app.get("/api/liquidity-events")
async def get_liquidity_events(limit: int = Query(default=30, ge=1, le=100)):
    """Returns recent LP add/remove events tracked on Mantle pools."""
    from database import get_recent_liquidity_events
    return get_recent_liquidity_events(limit)


@app.get("/api/analytics")
async def get_network_analytics_endpoint():
    """Returns advanced consensus metrics, token distributions, and volume stats."""
    from analytics_engine import get_network_analytics
    return get_network_analytics()


@app.get("/api/events")
async def sse_events():
    """SSE endpoint streaming live alerts directly to the dashboard."""
    from notification_engine import event_stream
    from fastapi.responses import StreamingResponse
    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,
        log_level=LOG_LEVEL.lower(),
    )
