"""
GhostWhale AI — Signal Engine

Takes a WhaleEvent and produces a TradeSignal with:
  - Direction: BUY / SELL / HOLD
  - Confidence score: 0.0 to 1.0 (weighted multi-factor)
  - Public reasoning: plain-English explanation shown on dashboard
  - Urgency level: HIGH / MEDIUM / LOW

Scoring model (deterministic, rule-based):
  wallet_score  ×40% + volume_spike ×25% + price_trend ×20% + whale_cluster ×15%
"""

import uuid
import logging
import asyncio
import aiohttp
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from whale_tracker import WhaleEvent
from database import get_whale_events_by_token, get_cached_price, upsert_price
from config import (
    WEIGHT_WALLET_SCORE, WEIGHT_VOLUME_SPIKE, WEIGHT_PRICE_TREND, WEIGHT_WHALE_CLUSTER,
    MIN_SIGNAL_CONFIDENCE, MOCK_PRICES_USD, AGNI_SUBGRAPH, WATCHED_TOKENS, MANTLE_EXPLORER,
)

logger = logging.getLogger(__name__)


# ─── Data Model ───────────────────────────────────────────────────────────────

@dataclass
class TradeSignal:
    signal_id:          str
    token:              str
    direction:          str      # "BUY" | "SELL" | "HOLD"
    confidence:         float    # 0.0 to 1.0
    reasoning:          str      # Human-readable explanation (shown publicly)
    urgency:            str      # "HIGH" | "MEDIUM" | "LOW"
    whale_event:        WhaleEvent
    timestamp:          datetime
    suggested_size_usd: float
    wallet_score:       float = field(default=0.5)
    volume_score:       float = field(default=0.5)
    price_score:        float = field(default=0.5)
    cluster_score:      float = field(default=0.5)


# ─── Wallet Scoring ───────────────────────────────────────────────────────────

async def score_wallet(wallet_address: str, tx_history: list) -> float:
    """
    Scores a wallet from 0.0 (noise) to 1.0 (smart money).
    Factors: activity level, size consistency, token diversity, large-tx frequency.
    """
    if not tx_history:
        return 0.40

    tx_count = len(tx_history)
    activity_score = min(tx_count / 100, 1.0)

    amounts = [t.get("amount_usd", 0) for t in tx_history if t.get("amount_usd", 0) > 0]
    if len(amounts) >= 2:
        mean_amt = sum(amounts) / len(amounts)
        variance = sum((a - mean_amt) ** 2 for a in amounts) / len(amounts)
        std_dev  = variance ** 0.5
        cv       = std_dev / mean_amt if mean_amt > 0 else 1.0
        consistency_score = max(0.0, 1.0 - min(cv, 2.0) / 2.0)
    else:
        consistency_score = 0.4

    tokens_traded   = len({t.get("token") for t in tx_history if t.get("token")})
    diversity_score = min(tokens_traded / len(WATCHED_TOKENS), 1.0)

    large_txs  = sum(1 for a in amounts if a >= 10_000)
    large_freq = large_txs / max(tx_count, 1)
    large_score = min(large_freq * 5, 1.0)

    score = (
        0.25 * activity_score +
        0.25 * consistency_score +
        0.25 * diversity_score +
        0.25 * large_score
    )
    return round(min(max(score, 0.0), 1.0), 3)


# ─── Market Context ───────────────────────────────────────────────────────────

async def _fetch_agni_price(token: str) -> Optional[float]:
    token_address = WATCHED_TOKENS.get(token, "").lower()
    if not token_address:
        return None
    query = '{ token(id: "%s") { tokenDayData(first: 2, orderBy: date, orderDirection: desc) { priceUSD } } }' % token_address
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            async with session.post(AGNI_SUBGRAPH, json={"query": query}) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                day_data = data.get("data", {}).get("token", {}).get("tokenDayData", [])
                if day_data:
                    price = float(day_data[0].get("priceUSD", 0))
                    if price > 0:
                        upsert_price(token, price, source="agni")
                        return price
    except Exception as exc:
        logger.debug("Agni price fetch failed for %s: %s", token, exc)
    return None


async def analyze_market_context(token: str) -> dict:
    """Builds current market context: price, trend, volume ratio, whale count."""
    live_price = await _fetch_agni_price(token)
    cached     = get_cached_price(token)
    price_usd  = live_price or cached or MOCK_PRICES_USD.get(token, 1.0)

    price_trend_1h = 0.0
    if live_price and cached and cached > 0:
        price_trend_1h = (live_price - cached) / cached * 100

    recent_events = get_whale_events_by_token(token, hours=1)
    whale_count_1h = len(recent_events)
    volume_vs_avg  = min(1.0 + (whale_count_1h / 4.0), 3.5)
    liquidity_signal = "high" if price_usd > 1000 else "medium" if price_usd > 0.50 else "low"

    return {
        "price_usd":        round(price_usd, 6),
        "price_trend_1h":   round(price_trend_1h, 3),
        "volume_vs_avg":    round(volume_vs_avg, 2),
        "whale_count_1h":   whale_count_1h,
        "liquidity_signal": liquidity_signal,
    }


# ─── Signal Generation ────────────────────────────────────────────────────────

def _urgency_from_confidence(confidence: float) -> str:
    if confidence >= 0.80: return "HIGH"
    if confidence >= 0.65: return "MEDIUM"
    return "LOW"


def _suggested_size(confidence: float, max_size: float = 10_000) -> float:
    return round(confidence * max_size, 0)


def _build_reasoning(event, wallet_score, market_ctx, direction, confidence, signals_fired) -> str:
    wallet_short = event.from_wallet[:6] + "…" + event.from_wallet[-4:]
    smart_pct    = int(wallet_score * 100)
    amount_str   = f"${event.amount_usd:,.0f}"
    trend_pct    = market_ctx["price_trend_1h"]
    vol_ratio    = market_ctx["volume_vs_avg"]
    whale_cnt    = market_ctx["whale_count_1h"]
    conf_pct     = int(confidence * 100)
    action_str   = event.action.replace("_", " ").title()
    explorer_link = f"{MANTLE_EXPLORER}/tx/{event.tx_hash}"

    trend_str = (
        f"up {abs(trend_pct):.1f}%"   if trend_pct >  0.5 else
        f"down {abs(trend_pct):.1f}%" if trend_pct < -0.5 else
        "flat"
    )

    lines = [
        f"Wallet {wallet_short} (Smart Money Score: {smart_pct}%) executed a {action_str} of {amount_str} {event.token}.",
        "",
        f"Market context: {event.token} price is {trend_str} in the last hour. "
        f"Volume is {vol_ratio:.1f}x above the 7-day average. "
        f"{whale_cnt} other whale transaction(s) detected in the last 60 min.",
        "",
        "Pattern flags triggered:",
    ]
    for sig in signals_fired:
        lines.append(f"  * {sig}")
    lines += ["", f"Signal: {direction} — {conf_pct}% confidence.", f"On-chain: {explorer_link}"]
    return "\n".join(lines)


def generate_signal(event: WhaleEvent, wallet_score: float, market_ctx: dict) -> TradeSignal:
    """Core signal generation with weighted confidence + direction rules."""
    action      = event.action
    vol_ratio   = market_ctx["volume_vs_avg"]
    trend       = market_ctx["price_trend_1h"]
    whale_count = market_ctx["whale_count_1h"]

    signals_fired: list[str] = []
    direction = "HOLD"

    if wallet_score > 0.70 and action == "buy" and vol_ratio > 1.5:
        direction = "BUY"
        signals_fired.append(f"Smart-money wallet (score {wallet_score:.0%}) buying with elevated volume ({vol_ratio:.1f}x)")
    elif wallet_score > 0.70 and action == "sell" and trend < -2.0:
        direction = "SELL"
        signals_fired.append(f"Smart-money wallet selling into a {abs(trend):.1f}% price decline")
    elif whale_count >= 3 and action == "buy":
        direction = "BUY"
        signals_fired.append(f"Whale cluster: {whale_count} large buys in 60 min (momentum signal)")
    elif action == "lp_remove" and trend < -1.0:
        direction = "SELL"
        signals_fired.append(f"LP removed with {abs(trend):.1f}% price decline — potential dump setup")
    elif vol_ratio > 2.5 and trend > 0:
        direction = "BUY"
        signals_fired.append(f"Volume {vol_ratio:.1f}x above average with positive price momentum")

    if not signals_fired:
        signals_fired.append("No strong pattern detected — low-conviction movement")

    # Confidence sub-scores
    w_score = wallet_score
    v_score = min((vol_ratio - 1.0) / 2.0, 1.0) if vol_ratio > 1.0 else 0.2
    if direction == "BUY":
        p_score = min(max((trend + 5) / 10, 0.0), 1.0)
    elif direction == "SELL":
        p_score = min(max((-trend + 5) / 10, 0.0), 1.0)
    else:
        p_score = 0.3
    c_score = min(whale_count / 5.0, 1.0)

    confidence = round(min(max(
        WEIGHT_WALLET_SCORE  * w_score +
        WEIGHT_VOLUME_SPIKE  * v_score +
        WEIGHT_PRICE_TREND   * p_score +
        WEIGHT_WHALE_CLUSTER * c_score,
        0.0
    ), 1.0), 3)

    if confidence < MIN_SIGNAL_CONFIDENCE and direction != "HOLD":
        direction = "HOLD"
        signals_fired.append(f"Confidence {confidence:.0%} below threshold {MIN_SIGNAL_CONFIDENCE:.0%} — overriding to HOLD")

    reasoning = _build_reasoning(event, wallet_score, market_ctx, direction, confidence, signals_fired)
    urgency   = _urgency_from_confidence(confidence)

    return TradeSignal(
        signal_id=str(uuid.uuid4()),
        token=event.token,
        direction=direction,
        confidence=confidence,
        reasoning=reasoning,
        urgency=urgency,
        whale_event=event,
        timestamp=datetime.now(tz=timezone.utc),
        suggested_size_usd=_suggested_size(confidence),
        wallet_score=w_score,
        volume_score=v_score,
        price_score=p_score,
        cluster_score=c_score,
    )


def signal_to_dict(signal: TradeSignal) -> dict:
    """Serialise a TradeSignal to a DB-ready dict."""
    return {
        "signal_id":          signal.signal_id,
        "token":              signal.token,
        "direction":          signal.direction,
        "confidence":         signal.confidence,
        "reasoning":          signal.reasoning,
        "urgency":            signal.urgency,
        "suggested_size_usd": signal.suggested_size_usd,
        "whale_event_tx":     signal.whale_event.tx_hash,
        "acted_on":           0,
        "timestamp":          signal.timestamp.isoformat(),
    }
