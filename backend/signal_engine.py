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


async def generate_signal(event: WhaleEvent, wallet_score: float, market_ctx: dict) -> TradeSignal:
    """
    Core signal generation utilizing risk analysis and the 5-agent council debate.
    """
    from risk_engine import analyze_transaction_risk
    from agent_council import hold_council_debate
    from database import get_agents

    # Generate signal ID
    signal_id = str(uuid.uuid4())

    # 1. Fetch wallet history for risk evaluation
    try:
        from whale_tracker import get_wallet_history
        history = await get_wallet_history(event.from_wallet, limit=20)
    except Exception:
        history = []

    # 2. Risk analysis
    risk_ctx = analyze_transaction_risk(
        event.from_wallet,
        event.to_wallet,
        event.amount_usd,
        event.token,
        history
    )

    # 3. Conduct multi-agent council debate
    votes = await hold_council_debate(signal_id, event, market_ctx, risk_ctx)

    # 4. Compute consensus
    # Fetch agents reputation scores
    try:
        agents_list = get_agents()
        agents_map = {a["name"]: a["reputation_score"] for a in agents_list}
    except Exception:
        agents_map = {}

    val_sum = 0.0
    weight_sum = 0.0
    for v in votes:
        direction_val = 1.0 if v["direction"] == "BUY" else -1.0 if v["direction"] == "SELL" else 0.0
        rep_weight = agents_map.get(v["agent_name"], 500.0) / 1000.0  # scale 0.0 to 1.0
        val_sum += direction_val * v["confidence"] * rep_weight
        weight_sum += v["confidence"] * rep_weight

    weighted_consensus = val_sum / weight_sum if weight_sum > 0 else 0.0

    if weighted_consensus > 0.20:
        direction = "BUY"
    elif weighted_consensus < -0.20:
        direction = "SELL"
    else:
        direction = "HOLD"

    avg_confidence = sum(v["confidence"] for v in votes) / len(votes) if votes else 0.5

    # Override direction if wash trading or severe risk detected
    if risk_ctx.get("wash_trade_detected") and direction == "BUY":
        direction = "HOLD"
        reasoning_override = "Wash trading loop detected by RiskGuard AI. Signal overridden to HOLD."
    else:
        reasoning_override = None

    # 5. Format detailed reasoning Markdown
    reasoning_lines = [
        f"**GhostWhale AI: Multi-Agent Council Verdict**",
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"Consensus Verdict: **{direction}** | Consensus Score: **{weighted_consensus:+.2f}** | Confidence: **{avg_confidence:.0%}**",
        f"Ecosystem Risk Score: **{risk_ctx['risk_score']}%** | Trigger Size: **${event.amount_usd:,.2f}**",
        ""
    ]

    if reasoning_override:
        reasoning_lines.append(f"⚠️ **Override Notice:** {reasoning_override}\n")

    reasoning_lines.append("**Agent Council Debate Logs:**")
    for v in votes:
        dir_emoji = "🟢 BUY" if v["direction"] == "BUY" else "🔴 SELL" if v["direction"] == "SELL" else "🟡 HOLD"
        reasoning_lines.append(f"• **{v['agent_name']}** ({dir_emoji} - {v['confidence']:.0%}):")
        reasoning_lines.append(f"  *\"{v['reasoning']}\"*")

    reasoning = "\n".join(reasoning_lines)
    urgency = _urgency_from_confidence(avg_confidence)

    # Calculate scores for dataclass compatibility
    w_score = next((v["confidence"] for v in votes if "Whale" in v["agent_name"]), 0.5)
    v_score = next((v["confidence"] for v in votes if "Momentum" in v["agent_name"]), 0.5)
    p_score = next((v["confidence"] for v in votes if "Liquidity" in v["agent_name"]), 0.5)
    c_score = next((v["confidence"] for v in votes if "Risk" in v["agent_name"]), 0.5)

    return TradeSignal(
        signal_id=signal_id,
        token=event.token,
        direction=direction,
        confidence=round(avg_confidence, 3),
        reasoning=reasoning,
        urgency=urgency,
        whale_event=event,
        timestamp=datetime.now(tz=timezone.utc),
        suggested_size_usd=_suggested_size(avg_confidence),
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
        "whale_event_tx":     signal.whale_event.tx_hash,
        "acted_on":           0,
        "timestamp":          signal.timestamp.isoformat(),
        "suggested_size_usd": signal.suggested_size_usd,
    }
