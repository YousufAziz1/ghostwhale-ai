"""
GhostWhale AI — Telegram Alert Bot

Sends formatted alpha alerts to a Telegram channel when high-confidence
signals are generated. Only active if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
are set in environment variables.
"""

import logging
from signal_engine import TradeSignal
from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    TELEGRAM_ENABLED,
    HIGH_CONFIDENCE_THRESHOLD,
    MANTLE_EXPLORER,
)

logger = logging.getLogger(__name__)


async def send_signal_alert(signal: TradeSignal) -> None:
    """
    Sends a formatted signal alert to the configured Telegram channel.
    Only fires for signals with confidence >= HIGH_CONFIDENCE_THRESHOLD (0.80).
    Silently skips if Telegram is not configured.
    """
    if not TELEGRAM_ENABLED:
        return

    if signal.confidence < HIGH_CONFIDENCE_THRESHOLD:
        return

    direction_emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "🟡"}.get(signal.direction, "⚪")
    urgency_emoji   = {"HIGH": "🚨", "MEDIUM": "⚡", "LOW": "📊"}.get(signal.urgency, "📊")
    conf_pct        = int(signal.confidence * 100)
    explorer_url    = f"{MANTLE_EXPLORER}/tx/{signal.whale_event.tx_hash}"

    message = (
        f"🐋 *GhostWhale AI Alert*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"*Token:* `{signal.token}`\n"
        f"*Signal:* {direction_emoji} {signal.direction} — {conf_pct}% confidence\n"
        f"*Urgency:* {urgency_emoji} {signal.urgency}\n"
        f"\n"
        f"📊 *Reasoning:*\n"
        f"{signal.reasoning}\n"
        f"\n"
        f"💰 *Suggested size:* ${signal.suggested_size_usd:,.0f}\n"
        f"⛓ [View on Mantle Explorer]({explorer_url})\n"
        f"🤖 Running on Mantle Network | ERC\\-8004 Agent"
    )

    try:
        import telegram  # type: ignore[import]
        bot = telegram.Bot(token=TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=message,
            parse_mode="MarkdownV2",
            disable_web_page_preview=False,
        )
        logger.info("📨 Telegram alert sent for signal %s", signal.signal_id)
    except Exception as exc:
        logger.warning("Telegram send failed: %s", exc)


async def send_pnl_update(mock_trades: list) -> None:
    """
    Sends a daily P&L summary to the Telegram channel.
    Shows settled trades with their outcomes.
    """
    if not TELEGRAM_ENABLED or not mock_trades:
        return

    settled = [t for t in mock_trades if t.get("settled")]
    if not settled:
        return

    total_pnl = sum(t.get("pnl_usd", 0) or 0 for t in settled)
    winners   = sum(1 for t in settled if (t.get("pnl_usd") or 0) > 0)
    win_rate  = int(winners / len(settled) * 100) if settled else 0
    pnl_emoji = "📈" if total_pnl >= 0 else "📉"

    trade_lines = []
    for t in settled[-5:]:  # last 5 trades
        pnl     = t.get("pnl_usd", 0) or 0
        emoji   = "✅" if pnl > 0 else "❌"
        trade_lines.append(
            f"{emoji} {t.get('direction', '?')} {t.get('token', '?')} "
            f"| P&L: ${pnl:+,.2f}"
        )

    message = (
        f"🐋 *GhostWhale Daily P&L Report*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"{pnl_emoji} *Total P&L:* ${total_pnl:+,.2f}\n"
        f"🏆 *Win Rate:* {win_rate}% ({winners}/{len(settled)} trades)\n"
        f"\n"
        f"*Recent Trades:*\n"
        + "\n".join(trade_lines) +
        f"\n\n🤖 GhostWhale AI | Mantle Network"
    )

    try:
        import telegram  # type: ignore[import]
        bot = telegram.Bot(token=TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=TELEGRAM_CHAT_ID,
            text=message,
            parse_mode="MarkdownV2",
        )
    except Exception as exc:
        logger.warning("Telegram P&L update failed: %s", exc)
