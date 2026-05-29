"""
GhostWhale AI — Analytics Engine

Computes advanced intelligence metrics:
  - Council agreement index (consensus rate)
  - P&L heatmaps by token
  - Smart money wallet score trends
"""

import logging
from database import get_conn

logger = logging.getLogger(__name__)

def get_network_analytics() -> dict:
    """
    Computes overall statistics for the dashboard.
    """
    with get_conn() as conn:
        # 1. Total volume tracked
        total_vol = conn.execute(
            "SELECT COALESCE(SUM(amount_usd), 0) FROM whale_events"
        ).fetchone()[0]

        # 2. Council Consensus Agreement rate (average confidence of signals)
        avg_confidence = conn.execute(
            "SELECT COALESCE(AVG(confidence), 0.5) FROM signals WHERE direction != 'HOLD'"
        ).fetchone()[0]

        # 3. PnL by token
        rows_pnl = conn.execute("""
            SELECT token, SUM(pnl_usd) AS token_pnl
            FROM trades
            WHERE settled = 1
            GROUP BY token
        """).fetchall()
        pnl_by_token = {r["token"]: round(r["token_pnl"], 2) for r in rows_pnl}

        # 4. Token transaction breakdown
        rows_count = conn.execute("""
            SELECT token, COUNT(*) AS count
            FROM whale_events
            GROUP BY token
        """).fetchall()
        token_distribution = {r["token"]: r["count"] for r in rows_count}

    return {
        "total_volume_usd": round(total_vol, 2),
        "consensus_rate": round(avg_confidence * 100, 1),
        "pnl_by_token": pnl_by_token,
        "token_distribution": token_distribution
    }
