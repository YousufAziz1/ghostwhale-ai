"""
GhostWhale AI — Whale Tracker

Polls Mantle RPC every 15 seconds.
Detects large ERC-20 token transfers and native MNT movements.
Outputs structured WhaleEvent objects and persists them to the DB.

Strategy:
  1. Get latest block number
  2. For each of the last SCAN_BLOCK_DEPTH blocks:
     a. Fetch Transfer logs for every WATCHED_TOKEN contract
     b. Estimate USD value using cached/live prices
     c. Filter by WHALE_THRESHOLD_USD
     d. Classify action (buy/sell/transfer/lp_add/lp_remove)
  3. Deduplicate via in-memory tx_hash set
  4. Call callback(event) for each new event
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Awaitable

from web3 import Web3
from web3.types import LogReceipt

from config import (
    MANTLE_RPC,
    WATCHED_TOKENS,
    TOKEN_SYMBOLS,
    MOCK_PRICES_USD,
    WHALE_THRESHOLD_USD,
    SCAN_INTERVAL_SECONDS,
    SCAN_BLOCK_DEPTH,
    MAX_SEEN_TXS_CACHE,
    MERCHANT_MOE_ROUTER,
    MERCHANT_MOE_LB_ROUTER,
    MERCHANT_MOE_FACTORY,
    AGNI_FACTORY,
    MANTLE_EXPLORER,
)
from database import save_whale_event, upsert_price, get_cached_price

logger = logging.getLogger(__name__)

# ─── Web3 Setup ──────────────────────────────────────────────────────────────

w3 = Web3(Web3.HTTPProvider(MANTLE_RPC, request_kwargs={"timeout": 10}))

# Minimal ERC-20 ABI — just what we need for Transfer events and decimals
ERC20_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "name": "from",  "type": "address"},
            {"indexed": True,  "name": "to",    "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    },
    {"inputs": [], "name": "decimals", "outputs": [{"type": "uint8"}], "type": "function", "stateMutability": "view"},
    {"inputs": [], "name": "symbol",   "outputs": [{"type": "string"}], "type": "function", "stateMutability": "view"},
]

# ERC-20 Transfer event topic (keccak256)
TRANSFER_TOPIC = w3.keccak(text="Transfer(address,address,uint256)").hex()

# DEX router addresses (lowercase) — used to classify buy/sell vs transfer
DEX_ADDRESSES: set[str] = {
    MERCHANT_MOE_ROUTER.lower(),
    MERCHANT_MOE_LB_ROUTER.lower(),
    MERCHANT_MOE_FACTORY.lower(),
    AGNI_FACTORY.lower(),
}

# Cache token decimals so we don't re-query each poll
_DECIMAL_CACHE: dict[str, int] = {
    "WMNT": 18, "mETH": 18, "USDT": 6, "USDY": 18, "USDC": 6, "WETH": 18,
}


# ─── Data Model ───────────────────────────────────────────────────────────────

@dataclass
class WhaleEvent:
    tx_hash:      str
    from_wallet:  str
    to_wallet:    str
    token:        str
    amount_usd:   float
    amount_raw:   str            # Raw token amount as string (for large ints)
    block_number: int
    timestamp:    datetime
    action:       str            # "buy" | "sell" | "transfer" | "lp_add" | "lp_remove"
    wallet_score: float = field(default=0.5)  # Populated by signal_engine later


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_token_decimals(symbol: str, address: str) -> int:
    """Fetch and cache token decimals. Falls back to 18."""
    if symbol in _DECIMAL_CACHE:
        return _DECIMAL_CACHE[symbol]
    try:
        contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=ERC20_ABI)
        decimals = contract.functions.decimals().call()
        _DECIMAL_CACHE[symbol] = decimals
        return decimals
    except Exception:
        logger.warning("Could not fetch decimals for %s, defaulting to 18", symbol)
        _DECIMAL_CACHE[symbol] = 18
        return 18


def _classify_action(from_addr: str, to_addr: str, token: str) -> str:
    """
    Classify a Transfer event into a GhostWhale action type.

    Rules (in priority order):
    1. to   = DEX router → BUY  (token flowing into DEX = user is selling,
                                  but from trader POV this is a DEX-routed buy)
    2. from = DEX router → SELL
    3. to   = FACTORY             → LP_ADD  (adding liquidity)
    4. from = FACTORY             → LP_REMOVE
    5. Otherwise                  → TRANSFER
    """
    from_l = from_addr.lower()
    to_l   = to_addr.lower()

    if to_l in DEX_ADDRESSES:
        return "sell"        # Token sent TO router = user selling
    if from_l in DEX_ADDRESSES:
        return "buy"         # Token received FROM router = user bought
    if to_l == MERCHANT_MOE_FACTORY.lower() or to_l == AGNI_FACTORY.lower():
        return "lp_add"
    if from_l == MERCHANT_MOE_FACTORY.lower() or from_l == AGNI_FACTORY.lower():
        return "lp_remove"
    return "transfer"


def _get_price_usd(token: str) -> float:
    """
    Returns best-available USD price for a token.
    Priority: live cached price → mock fallback.
    """
    cached = get_cached_price(token)
    if cached and cached > 0:
        return cached
    return MOCK_PRICES_USD.get(token, 1.0)


def _raw_to_usd(raw_value: int, decimals: int, price_usd: float) -> float:
    """Convert raw token integer amount to USD value."""
    token_amount = raw_value / (10 ** decimals)
    return token_amount * price_usd


def _make_event_dict(event: WhaleEvent) -> dict:
    """Serialise a WhaleEvent to a DB-ready dict."""
    return {
        "tx_hash":      event.tx_hash,
        "from_wallet":  event.from_wallet,
        "to_wallet":    event.to_wallet,
        "token":        event.token,
        "amount_usd":   event.amount_usd,
        "amount_raw":   event.amount_raw,
        "action":       event.action,
        "block_number": event.block_number,
        "wallet_score": event.wallet_score,
        "timestamp":    event.timestamp.isoformat(),
    }


# ─── Block Scanner ────────────────────────────────────────────────────────────

async def scan_recent_blocks(num_blocks: int = SCAN_BLOCK_DEPTH) -> list[WhaleEvent]:
    """
    Scans the last `num_blocks` Mantle blocks for whale-sized token movements.

    For each watched token, fetches Transfer event logs and filters by USD value.
    Returns a list of WhaleEvent objects exceeding WHALE_THRESHOLD_USD.
    """
    events: list[WhaleEvent] = []

    try:
        # Offset by 3 blocks to avoid "invalid block range" on load-balanced public RPCs
        latest: int = w3.eth.block_number - 3
    except Exception as exc:
        logger.error("RPC block_number failed: %s", exc)
        return events

    from_block = max(0, latest - num_blocks)
    to_block   = latest

    for symbol, address in WATCHED_TOKENS.items():
        try:
            checksum_addr = Web3.to_checksum_address(address)
            decimals      = _get_token_decimals(symbol, address)
            price_usd     = _get_price_usd(symbol)

            # Fetch Transfer logs for this token across the block range
            logs: list[LogReceipt] = w3.eth.get_logs({
                "fromBlock": from_block,
                "toBlock":   to_block,
                "address":   checksum_addr,
                "topics":    [TRANSFER_TOPIC],
            })

            for log in logs:
                try:
                    # Decode the non-indexed `value` field from log data
                    raw_value: int = int(log["data"].hex(), 16)
                    amount_usd     = _raw_to_usd(raw_value, decimals, price_usd)

                    if amount_usd < WHALE_THRESHOLD_USD:
                        continue

                    # Decode indexed address topics (topic[1] = from, topic[2] = to)
                    from_wallet = Web3.to_checksum_address(
                        "0x" + log["topics"][1].hex()[-40:]
                    )
                    to_wallet   = Web3.to_checksum_address(
                        "0x" + log["topics"][2].hex()[-40:]
                    )

                    # Get block timestamp
                    block = w3.eth.get_block(log["blockNumber"])
                    ts    = datetime.fromtimestamp(block["timestamp"], tz=timezone.utc)

                    action = _classify_action(from_wallet, to_wallet, symbol)
                    tx_hash = log["transactionHash"].hex()

                    whale_event = WhaleEvent(
                        tx_hash=tx_hash,
                        from_wallet=from_wallet,
                        to_wallet=to_wallet,
                        token=symbol,
                        amount_usd=round(amount_usd, 2),
                        amount_raw=str(raw_value),
                        block_number=log["blockNumber"],
                        timestamp=ts,
                        action=action,
                    )
                    events.append(whale_event)

                except Exception as log_exc:
                    logger.debug("Error processing log: %s", log_exc)
                    continue

        except Exception as token_exc:
            logger.warning("Error scanning token %s: %s", symbol, token_exc)
            continue

    logger.debug("scan_recent_blocks: blocks %d-%d → %d whale events", from_block, to_block, len(events))
    return events


# ─── Wallet History ───────────────────────────────────────────────────────────

async def get_wallet_history(wallet_address: str, limit: int = 20) -> list[dict]:
    """
    Fetches recent outgoing Transfer events for a wallet across all watched tokens.
    Used by signal_engine.score_wallet() to assess "smart money" patterns.

    Returns a list of dicts with: token, amount_usd, action, block_number, timestamp
    """
    history: list[dict] = []
    checksum = Web3.to_checksum_address(wallet_address)

    try:
        latest = w3.eth.block_number
        # Look back ~7 days: Mantle ~2s blocks → 7d ≈ 302,400 blocks
        from_block = max(0, latest - 302_400)
    except Exception:
        return history

    for symbol, address in WATCHED_TOKENS.items():
        try:
            decimals  = _get_token_decimals(symbol, address)
            price_usd = _get_price_usd(symbol)
            # Transfers FROM the wallet (sells / sends)
            logs = w3.eth.get_logs({
                "fromBlock": from_block,
                "toBlock":   latest,
                "address":   Web3.to_checksum_address(address),
                "topics":    [
                    TRANSFER_TOPIC,
                    "0x" + "0" * 24 + checksum[2:].lower(),  # from = wallet
                ],
            })
            for log in logs:
                raw_value  = int(log["data"].hex(), 16)
                amount_usd = _raw_to_usd(raw_value, decimals, price_usd)
                block      = w3.eth.get_block(log["blockNumber"])
                history.append({
                    "token":        symbol,
                    "amount_usd":   round(amount_usd, 2),
                    "action":       "out",
                    "block_number": log["blockNumber"],
                    "timestamp":    datetime.fromtimestamp(block["timestamp"], tz=timezone.utc).isoformat(),
                })
        except Exception:
            continue

    # Sort by block descending, return top N
    history.sort(key=lambda x: x["block_number"], reverse=True)
    return history[:limit]


# ─── Continuous Scanner ───────────────────────────────────────────────────────

async def continuous_scan(
    callback: Callable[[WhaleEvent], Awaitable[None]],
) -> None:
    """
    Infinite loop: scans Mantle every SCAN_INTERVAL_SECONDS seconds.
    Deduplicates events via in-memory tx_hash set (bounded to MAX_SEEN_TXS_CACHE).
    Calls callback(event) for each new whale event.
    Persists events to the DB.
    """
    seen_txs: set[str] = set()

    logger.info("🐋 GhostWhale scanner started — polling every %ds", SCAN_INTERVAL_SECONDS)

    while True:
        try:
            events = await scan_recent_blocks()
            for event in events:
                if event.tx_hash not in seen_txs:
                    # Bound cache size
                    if len(seen_txs) >= MAX_SEEN_TXS_CACHE:
                        seen_txs.pop()

                    seen_txs.add(event.tx_hash)

                    # Persist to DB (ignore duplicates)
                    save_whale_event(_make_event_dict(event))

                    try:
                        await callback(event)
                    except Exception as cb_exc:
                        logger.error("Callback error for tx %s: %s", event.tx_hash, cb_exc)

        except Exception as scan_exc:
            logger.error("scan_recent_blocks error: %s", scan_exc)

        await asyncio.sleep(SCAN_INTERVAL_SECONDS)


# ─── Connection Check ─────────────────────────────────────────────────────────

def check_connection() -> dict:
    """Quick connectivity test. Returns status dict."""
    try:
        block = w3.eth.block_number
        chain = w3.eth.chain_id
        return {
            "connected": True,
            "chain_id": chain,
            "latest_block": block,
            "rpc": MANTLE_RPC,
        }
    except Exception as exc:
        return {"connected": False, "error": str(exc), "rpc": MANTLE_RPC}
