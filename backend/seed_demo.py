"""
GhostWhale AI — Demo Data Seeder

Populates the SQLite DB with realistic mock whale events, signals, and trades.
Run this ONCE before the hackathon demo to make the dashboard look fully alive.

Usage:
    cd ghostwhale-ai/backend
    python seed_demo.py

Generates:
  - 15 whale events across different tokens/actions
  - 10 AI trade signals with full reasoning
  - 8 settled mock trades with P&L
  - Realistic timestamps spanning the last 2 hours
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uuid
import random
from datetime import datetime, timezone, timedelta
from database import init_db, save_whale_event, save_signal, save_trade, settle_trade, get_conn

# ── Seed config ────────────────────────────────────────────────────────────────
WALLETS = [
    "0xA2B3C4D5E6F7a8B9C0D1E2F3A4B5C6D7E8F9a0B1",
    "0xDEAD1234BEEF5678CAFE9012BABE3456FACE7890",
    "0x1111222233334444555566667777888899990000",
    "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
    "0xF00DF00DF00DF00DF00DF00DF00DF00DF00DF00D",
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
]

TOKENS = ["mETH", "WMNT", "USDT", "USDC", "WETH"]

MOCK_PRICES = {
    "mETH": 2120.00,
    "WMNT": 0.66,
    "USDT": 1.0,
    "USDC": 1.0,
    "WETH": 2120.00,
}

ACTIONS = ["buy", "sell", "buy", "buy", "transfer", "lp_add", "lp_remove"]

WHALE_SCENARIOS = [
    {
        "token": "mETH",
        "action": "buy",
        "amount_usd": 285_000,
        "wallet_score": 0.87,
        "direction": "BUY",
        "confidence": 0.83,
        "urgency": "HIGH",
        "reasoning": (
            "Wallet 0xA2B3…B1 (Smart Money Score: 87%) executed a Buy of $285,000 mETH.\n\n"
            "Market context: mETH price is up 2.1% in the last hour. "
            "Volume is 2.8x above the 7-day average. "
            "3 other whale transactions detected in the last 60 min.\n\n"
            "Pattern flags triggered:\n"
            "  * Smart-money wallet (score 87%) buying with elevated volume (2.8x)\n"
            "  * Whale cluster: 3 large buys in 60 min (momentum signal)\n\n"
            "Signal: BUY — 83% confidence.\n"
            "On-chain: https://mantlescan.xyz/tx/0xaaaa"
        ),
        "size_usd": 8300,
    },
    {
        "token": "WMNT",
        "action": "buy",
        "amount_usd": 142_000,
        "wallet_score": 0.74,
        "direction": "BUY",
        "confidence": 0.77,
        "urgency": "HIGH",
        "reasoning": (
            "Wallet 0xDEAD…90 (Smart Money Score: 74%) executed a Buy of $142,000 WMNT.\n\n"
            "Market context: WMNT price is up 1.3% in the last hour. "
            "Volume is 2.1x above the 7-day average. "
            "2 other whale transactions detected in the last 60 min.\n\n"
            "Pattern flags triggered:\n"
            "  * Smart-money wallet (score 74%) buying with elevated volume (2.1x)\n"
            "  * Volume 2.1x above average with positive price momentum\n\n"
            "Signal: BUY — 77% confidence.\n"
            "On-chain: https://mantlescan.xyz/tx/0xbbbb"
        ),
        "size_usd": 7700,
    },
    {
        "token": "mETH",
        "action": "sell",
        "amount_usd": 390_000,
        "wallet_score": 0.91,
        "direction": "SELL",
        "confidence": 0.89,
        "urgency": "HIGH",
        "reasoning": (
            "Wallet 0x1111…00 (Smart Money Score: 91%) executed a Sell of $390,000 mETH.\n\n"
            "Market context: mETH price is down 3.2% in the last hour. "
            "Volume is 3.4x above the 7-day average. "
            "2 other whale transactions detected in the last 60 min.\n\n"
            "Pattern flags triggered:\n"
            "  * Smart-money wallet (score 91%) selling into a 3.2% price decline\n"
            "  * High-value sell event — $390K exit detected\n\n"
            "Signal: SELL — 89% confidence.\n"
            "On-chain: https://mantlescan.xyz/tx/0xcccc"
        ),
        "size_usd": 8900,
    },
    {
        "token": "USDT",
        "action": "buy",
        "amount_usd": 78_500,
        "wallet_score": 0.61,
        "direction": "HOLD",
        "confidence": 0.58,
        "urgency": "LOW",
        "reasoning": (
            "Wallet 0xABCD…01 (Smart Money Score: 61%) executed a Buy of $78,500 USDT.\n\n"
            "Market context: USDT price is flat in the last hour. "
            "Volume is 1.2x above the 7-day average. "
            "0 other whale transactions detected in the last 60 min.\n\n"
            "Pattern flags triggered:\n"
            "  * No strong pattern detected — low-conviction movement\n"
            "  * Confidence 58% below threshold 65% — overriding to HOLD\n\n"
            "Signal: HOLD — 58% confidence.\n"
            "On-chain: https://mantlescan.xyz/tx/0xdddd"
        ),
        "size_usd": 0,
    },
    {
        "token": "WETH",
        "action": "lp_remove",
        "amount_usd": 520_000,
        "wallet_score": 0.82,
        "direction": "SELL",
        "confidence": 0.78,
        "urgency": "HIGH",
        "reasoning": (
            "Wallet 0xF00D…0D (Smart Money Score: 82%) executed a Lp Remove of $520,000 WETH.\n\n"
            "Market context: WETH price is down 2.8% in the last hour. "
            "Volume is 2.6x above the 7-day average. "
            "1 other whale transaction detected in the last 60 min.\n\n"
            "Pattern flags triggered:\n"
            "  * LP removed with 2.8% price decline — potential dump setup\n"
            "  * Smart-money wallet (score 82%) exiting position\n\n"
            "Signal: SELL — 78% confidence.\n"
            "On-chain: https://mantlescan.xyz/tx/0xeeee"
        ),
        "size_usd": 7800,
    },
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def fake_tx() -> str:
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:24]

def minutes_ago(n: float) -> str:
    return (datetime.now(tz=timezone.utc) - timedelta(minutes=n)).isoformat()

def clear_db():
    """Wipe existing demo data so we can reseed cleanly."""
    with get_conn() as conn:
        conn.execute("DELETE FROM trades")
        conn.execute("DELETE FROM votes")
        conn.execute("DELETE FROM reputation_history")
        conn.execute("DELETE FROM agents")
        conn.execute("DELETE FROM liquidity_events")
        conn.execute("DELETE FROM signals")
        conn.execute("DELETE FROM whale_events")
        conn.execute("DELETE FROM price_cache")
    print("[CLEAR] Cleared existing data")

def seed_prices():
    from database import upsert_price
    for token, price in MOCK_PRICES.items():
        upsert_price(token, price + random.uniform(-price*0.01, price*0.01), source="seed")
    print(f"[PRICE] Seeded prices for {len(MOCK_PRICES)} tokens")

def seed_whale_events() -> list[str]:
    """Returns list of tx_hashes for later signal linking."""
    tx_hashes = []
    scenarios_extended = WHALE_SCENARIOS.copy()

    # Add 10 more random events
    for i in range(10):
        token  = random.choice(TOKENS)
        action = random.choice(ACTIONS)
        price  = MOCK_PRICES[token]
        amount = random.uniform(50_000, 400_000)
        scenarios_extended.append({
            "token":        token,
            "action":       action,
            "amount_usd":   amount,
            "wallet_score": random.uniform(0.45, 0.88),
        })

    for i, s in enumerate(scenarios_extended):
        tx = fake_tx()
        tx_hashes.append(tx)
        from_w = random.choice(WALLETS)
        to_w   = random.choice([w for w in WALLETS if w != from_w])
        token  = s["token"]
        amount = s["amount_usd"]
        price  = MOCK_PRICES[token]
        raw    = int(amount / price * 1e18)
        ts     = minutes_ago(random.uniform(0.1, 120))

        save_whale_event({
            "tx_hash":      tx,
            "from_wallet":  from_w,
            "to_wallet":    to_w,
            "token":        token,
            "amount_usd":   round(amount, 2),
            "amount_raw":   str(raw),
            "action":       s["action"],
            "block_number": 94_760_000 + i * 300 + random.randint(1, 100),
            "wallet_score": s.get("wallet_score", 0.6),
            "timestamp":    ts,
        })

    print(f"[WHALE] Seeded {len(scenarios_extended)} whale events")
    return tx_hashes

def seed_signals(tx_hashes: list[str]) -> list[str]:
    """Returns list of signal_ids."""
    signal_ids = []
    for i, s in enumerate(WHALE_SCENARIOS):
        if i >= len(tx_hashes): break
        sid = str(uuid.uuid4())
        signal_ids.append(sid)
        ts  = minutes_ago(random.uniform(0.1, 110))

        save_signal({
            "signal_id":          sid,
            "token":              s["token"],
            "direction":          s["direction"],
            "confidence":         s["confidence"],
            "reasoning":          s["reasoning"],
            "urgency":            s["urgency"],
            "suggested_size_usd": s["size_usd"],
            "whale_event_tx":     tx_hashes[i],
            "acted_on":           1 if s["size_usd"] > 0 else 0,
            "timestamp":          ts,
        })

    print(f"[SIGNAL] Seeded {len(signal_ids)} signals")
    return signal_ids

def seed_votes(signal_ids: list[str]):
    """Seed council votes for each signal."""
    from database import save_vote
    
    agent_configs = [
        ("WhaleHunter AI", ["BUY", "BUY", "SELL", "HOLD", "SELL"]),
        ("LiquidityAI", ["BUY", "HOLD", "HOLD", "HOLD", "SELL"]),
        ("MomentumAI", ["BUY", "BUY", "SELL", "HOLD", "SELL"]),
        ("RiskGuard AI", ["BUY", "BUY", "SELL", "HOLD", "HOLD"]),
        ("MacroAI", ["BUY", "HOLD", "HOLD", "HOLD", "HOLD"])
    ]

    reasonings = {
        "WhaleHunter AI": "Large transaction volume displays strong smart money presence.",
        "LiquidityAI": "Pool ratios remain stable, providing a strong cushion against slippage.",
        "MomentumAI": "Ecosystem trends indicate local support levels holding.",
        "RiskGuard AI": "Risk checks are clean. No recursive wallet transfers detected.",
        "MacroAI": "Ecosystem gas fees remain nominal, displaying steady transaction activity."
    }

    for i, sid in enumerate(signal_ids):
        ts = minutes_ago(random.uniform(0.1, 110))
        for agent_name, votes_list in agent_configs:
            vote_dir = votes_list[i % len(votes_list)]
            save_vote({
                "signal_id": sid,
                "agent_name": agent_name,
                "direction": vote_dir,
                "confidence": round(random.uniform(0.60, 0.90), 2),
                "reasoning": reasonings[agent_name],
                "timestamp": ts
            })
    print(f"[VOTES] Seeded council votes for signals")

def seed_liquidity_events():
    """Seed sample LP Mint/Burn events."""
    from database import save_liquidity_event
    events = [
        {
            "tx_hash": fake_tx(),
            "pool": "USDT-WMNT-Moe",
            "token0": "USDT",
            "token1": "WMNT",
            "action": "lp_add",
            "amount_usd": 125000.0,
            "block_number": 94760120,
            "timestamp": minutes_ago(15)
        },
        {
            "tx_hash": fake_tx(),
            "pool": "mETH-WMNT-Moe",
            "token0": "mETH",
            "token1": "WMNT",
            "action": "lp_remove",
            "amount_usd": 85000.0,
            "block_number": 94760240,
            "timestamp": minutes_ago(45)
        }
    ]
    for e in events:
        save_liquidity_event(e)
    print(f"[LIQUIDITY] Seeded {len(events)} liquidity events")

def seed_trades(signal_ids: list[str]):
    """Seed settled trades with realistic P&L."""
    trade_outcomes = [
        # (signal_id_index, token, direction, entry, exit, size_usd, settled_minutes_ago)
        (0, "mETH", "BUY",  2100.0, 2170.0, 8300,  2),   # +3.3% win
        (1, "WMNT", "BUY",  0.648,  0.690,  7700,  3),    # +6.5% win
        (2, "mETH", "SELL", 2125.0, 2080.0, 8900,  1.5),   # +2.1% win
        (4, "WETH", "SELL", 2125.0, 2097.0, 7800,  1),   # +1.3% win
    ]

    # Add some mixed results
    extra_outcomes = [
        ("WMNT", "BUY",  0.63,   0.612,  6500, 5),   # -2.9% loss
        ("mETH", "BUY",  2090.0, 2130.0, 7200, 6),  # +1.9% win
        ("USDC", "SELL", 1.001,  0.999, 5000, 4),   # +0.2% win
        ("WETH", "BUY",  2110.0, 2087.0, 6800, 3.5),  # -1.1% loss
    ]

    trade_id_counter = []

    for idx, token, direction, entry, exit_p, size_usd, settled_ago in trade_outcomes:
        if idx >= len(signal_ids): continue
        sid = signal_ids[idx]

        trade_row = {
            "signal_id":   sid,
            "status":      "mock",
            "tx_hash":     None,
            "token":       token,
            "direction":   direction,
            "entry_price": entry,
            "size_usd":    size_usd,
            "mock":        1,
            "timestamp":   minutes_ago(settled_ago + 0.5),
        }
        tid = save_trade(trade_row)
        trade_id_counter.append(tid)

        # Settle it
        settle_trade(tid, exit_p)

    for token, direction, entry, exit_p, size_usd, settled_ago in extra_outcomes:
        extra_sid = str(uuid.uuid4())
        save_signal({
            "signal_id":          extra_sid,
            "token":              token,
            "direction":          direction,
            "confidence":         round(random.uniform(0.66, 0.84), 2),
            "reasoning":          f"Automated seed signal for {token} {direction}.",
            "urgency":            random.choice(["HIGH", "MEDIUM"]),
            "suggested_size_usd": size_usd,
            "whale_event_tx":     None,   # No FK — extra seeded signal
            "acted_on":           1,
            "timestamp":          minutes_ago(settled_ago + 0.5),
        })
        trade_row = {
            "signal_id":   extra_sid,
            "status":      "mock",
            "tx_hash":     None,
            "token":       token,
            "direction":   direction,
            "entry_price": entry,
            "size_usd":    size_usd,
            "mock":        1,
            "timestamp":   minutes_ago(settled_ago + 0.5),
        }
        tid = save_trade(trade_row)
        settle_trade(tid, exit_p)

    total = len(trade_outcomes) + len(extra_outcomes)
    print(f"[TRADE] Seeded {total} trades (all settled with P&L)")


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n[GhostWhale] Demo Seeder\n" + "-" * 35)

    init_db()
    clear_db()
    init_db() # re-init empty tables and seed agents registry
    seed_prices()
    tx_hashes  = seed_whale_events()
    signal_ids = seed_signals(tx_hashes)
    seed_votes(signal_ids)
    seed_liquidity_events()
    seed_trades(signal_ids)

    # Print summary
    from database import get_agent_stats
    stats = get_agent_stats()
    print("\n[OK] Seed complete! Dashboard stats:")
    print(f"   Signals:      {stats['total_signals']}")
    print(f"   Trades:       {stats['settled_trades']}")
    print(f"   Win Rate:     {stats['win_rate_pct']}%")
    print(f"   Total P&L:    ${stats['total_pnl_usd']:+,.2f}")
    print(f"   Reputation:   {stats['reputation_score']}/1000")
    print("\n>> Now restart the backend: python main.py")
