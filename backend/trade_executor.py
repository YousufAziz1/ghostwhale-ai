"""
GhostWhale AI — Trade Executor

Supports MOCK mode (default) and REAL mode.
MOCK: logs the trade, simulates exit after 30 min using live price, computes P&L.
REAL: builds Merchant Moe swap calldata, signs, and broadcasts.
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from web3 import Web3

from signal_engine import TradeSignal
from database import save_trade, settle_trade, get_unsettled_mock_trades, get_cached_price
from config import (
    MANTLE_RPC, MERCHANT_MOE_ROUTER, MAX_TRADE_SIZE_USD,
    MIN_SIGNAL_CONFIDENCE, MOCK_MODE, SLIPPAGE_BPS,
    MOCK_EXIT_DELAY_SECONDS, PRIVATE_KEY, MOCK_PRICES_USD,
)

logger = logging.getLogger(__name__)

w3 = Web3(Web3.HTTPProvider(MANTLE_RPC, request_kwargs={"timeout": 10}))


# ─── Data Model ──────────────────────────────────────────────────────────────

@dataclass
class TradeResult:
    signal_id:   str
    status:      str     # "mock" | "executed" | "skipped" | "failed"
    tx_hash:     str | None
    token:       str
    direction:   str
    entry_price: float
    size_usd:    float
    mock:        bool
    trade_id:    int | None = None  # DB row ID


# ─── Price Helpers ────────────────────────────────────────────────────────────

def get_current_price(token: str) -> float:
    """Returns best available price: DB cache → mock fallback."""
    cached = get_cached_price(token)
    if cached and cached > 0:
        return cached
    return MOCK_PRICES_USD.get(token, 1.0)


# ─── Mock Execution ───────────────────────────────────────────────────────────

def _mock_execute(signal: TradeSignal) -> TradeResult:
    """
    Simulates a trade without real funds.
    Records entry price; a background settler will close it 30 min later.
    """
    size_usd    = min(signal.suggested_size_usd, MAX_TRADE_SIZE_USD)
    entry_price = get_current_price(signal.token)

    trade_row = {
        "signal_id":   signal.signal_id,
        "status":      "mock",
        "tx_hash":     None,
        "token":       signal.token,
        "direction":   signal.direction,
        "entry_price": entry_price,
        "size_usd":    size_usd,
        "mock":        1,
        "timestamp":   signal.timestamp.isoformat(),
    }
    trade_id = save_trade(trade_row)

    logger.info(
        "[MOCK] %s %s | entry=$%.4f | size=$%.0f",
        signal.direction, signal.token, entry_price, size_usd
    )

    return TradeResult(
        signal_id=signal.signal_id,
        status="mock",
        tx_hash=None,
        token=signal.token,
        direction=signal.direction,
        entry_price=entry_price,
        size_usd=size_usd,
        mock=True,
        trade_id=trade_id,
    )


# ─── Real Execution ───────────────────────────────────────────────────────────

def _real_execute(signal: TradeSignal, private_key: str) -> TradeResult:
    """
    Real on-chain swap via Merchant Moe.
    WARNING: Only active when MOCK_MODE=false and PRIVATE_KEY is set.
    """
    if not private_key:
        logger.error("REAL mode requires PRIVATE_KEY — falling back to mock")
        return _mock_execute(signal)

    # Minimal Merchant Moe Router ABI for swapExactTokensForTokens
    MOE_ROUTER_ABI = [{
        "inputs": [
            {"name": "amountIn",     "type": "uint256"},
            {"name": "amountOutMin", "type": "uint256"},
            {"name": "path",         "type": "address[]"},
            {"name": "to",           "type": "address"},
            {"name": "deadline",     "type": "uint256"},
        ],
        "name": "swapExactTokensForTokens",
        "outputs": [{"name": "amounts", "type": "uint256[]"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }]

    try:
        account    = w3.eth.account.from_key(private_key)
        router     = w3.eth.contract(
            address=Web3.to_checksum_address(MERCHANT_MOE_ROUTER),
            abi=MOE_ROUTER_ABI,
        )
        entry_price = get_current_price(signal.token)
        size_usd    = min(signal.suggested_size_usd, MAX_TRADE_SIZE_USD)
        deadline    = int(datetime.now(tz=timezone.utc).timestamp()) + 300  # 5 min

        # NOTE: In production, resolve actual token in/out addresses and amounts.
        # This is a stub — the path and amounts need to be computed from DEX quotes.
        logger.warning("REAL execution stub — transaction NOT broadcast (requires full path resolution)")

        trade_row = {
            "signal_id":   signal.signal_id,
            "status":      "skipped",
            "tx_hash":     None,
            "token":       signal.token,
            "direction":   signal.direction,
            "entry_price": entry_price,
            "size_usd":    size_usd,
            "mock":        0,
            "timestamp":   signal.timestamp.isoformat(),
        }
        trade_id = save_trade(trade_row)

        return TradeResult(
            signal_id=signal.signal_id,
            status="skipped",
            tx_hash=None,
            token=signal.token,
            direction=signal.direction,
            entry_price=entry_price,
            size_usd=size_usd,
            mock=False,
            trade_id=trade_id,
        )

    except Exception as exc:
        logger.error("Real execution failed: %s", exc)
        return TradeResult(
            signal_id=signal.signal_id,
            status="failed",
            tx_hash=None,
            token=signal.token,
            direction=signal.direction,
            entry_price=0.0,
            size_usd=0.0,
            mock=False,
        )


# ─── Main Entrypoint ─────────────────────────────────────────────────────────

def execute_trade(signal: TradeSignal) -> TradeResult:
    """
    Routes to mock or real execution based on MOCK_MODE config.
    Always enforces MIN_SIGNAL_CONFIDENCE and MAX_TRADE_SIZE_USD guards.
    """
    if signal.confidence < MIN_SIGNAL_CONFIDENCE:
        logger.debug("Signal %s skipped — confidence %.2f below threshold", signal.signal_id, signal.confidence)
        return TradeResult(
            signal_id=signal.signal_id, status="skipped", tx_hash=None,
            token=signal.token, direction=signal.direction,
            entry_price=0.0, size_usd=0.0, mock=MOCK_MODE,
        )

    if signal.direction == "HOLD":
        return TradeResult(
            signal_id=signal.signal_id, status="skipped", tx_hash=None,
            token=signal.token, direction="HOLD",
            entry_price=0.0, size_usd=0.0, mock=MOCK_MODE,
        )

    if MOCK_MODE:
        return _mock_execute(signal)
    return _real_execute(signal, PRIVATE_KEY)


# ─── Mock Settlement Loop ─────────────────────────────────────────────────────

async def run_mock_settler() -> None:
    """
    Background loop that periodically settles open mock trades.
    A trade is settled MOCK_EXIT_DELAY_SECONDS after entry using the current price.
    Runs every 60 seconds.
    """
    logger.info("Mock settler started (exit delay=%ds)", MOCK_EXIT_DELAY_SECONDS)
    while True:
        try:
            unsettled = get_unsettled_mock_trades()
            now = datetime.now(tz=timezone.utc)

            for trade in unsettled:
                entry_ts = datetime.fromisoformat(trade["timestamp"])
                if entry_ts.tzinfo is None:
                    entry_ts = entry_ts.replace(tzinfo=timezone.utc)

                age_seconds = (now - entry_ts).total_seconds()
                if age_seconds >= MOCK_EXIT_DELAY_SECONDS:
                    exit_price = get_current_price(trade["token"])
                    settled    = settle_trade(trade["id"], exit_price)
                    pnl        = settled.get("pnl_usd", 0)
                    logger.info(
                        "[MOCK SETTLE] Trade#%d %s %s | P&L=$%.2f",
                        trade["id"], trade["direction"], trade["token"], pnl
                    )

        except Exception as exc:
            logger.error("Mock settler error: %s", exc)

        await asyncio.sleep(60)
