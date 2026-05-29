"""
GhostWhale AI — SQLite Decision Log

Stores every whale event, signal, and trade execution transparently.
This is the on-chain decision log that makes GhostWhale auditable.

Tables:
  whale_events  — raw on-chain movements detected
  signals       — AI-generated trade signals with full reasoning
  trades        — execution results (mock or real), including P&L
  price_cache   — short-lived token price snapshots
"""

import sqlite3
import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Optional, Generator

from config import DB_PATH

logger = logging.getLogger(__name__)


# ─── Connection Helpers ───────────────────────────────────────────────────────

@contextmanager
def get_conn() -> Generator[sqlite3.Connection, None, None]:
    """Thread-safe context-managed SQLite connection with WAL mode."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row          # Rows as dict-like objects
    conn.execute("PRAGMA journal_mode=WAL") # Better concurrent read perf
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─── Schema Initialisation ────────────────────────────────────────────────────

def init_db() -> None:
    """Create all tables if they don't exist. Safe to call on every startup."""
    with get_conn() as conn:
        c = conn.cursor()

        # Whale events — raw on-chain movements
        c.execute("""
            CREATE TABLE IF NOT EXISTS whale_events (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash       TEXT    UNIQUE NOT NULL,
                from_wallet   TEXT    NOT NULL,
                to_wallet     TEXT    NOT NULL,
                token         TEXT    NOT NULL,
                amount_usd    REAL    NOT NULL DEFAULT 0,
                amount_raw    TEXT,                     -- raw token amount string
                action        TEXT    NOT NULL,         -- buy/sell/transfer/lp_add/lp_remove
                block_number  INTEGER NOT NULL,
                wallet_score  REAL    DEFAULT 0.5,      -- smart money score at detection time
                timestamp     TEXT    NOT NULL
            )
        """)

        # Trade signals — AI-generated with full reasoning
        c.execute("""
            CREATE TABLE IF NOT EXISTS signals (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id        TEXT    UNIQUE NOT NULL,
                token            TEXT    NOT NULL,
                direction        TEXT    NOT NULL,       -- BUY / SELL / HOLD
                confidence       REAL    NOT NULL,
                reasoning        TEXT    NOT NULL,
                urgency          TEXT    NOT NULL,       -- HIGH / MEDIUM / LOW
                suggested_size_usd REAL  NOT NULL DEFAULT 0,
                whale_event_tx   TEXT    REFERENCES whale_events(tx_hash),
                acted_on         INTEGER NOT NULL DEFAULT 0,  -- bool: was a trade placed?
                timestamp        TEXT    NOT NULL
            )
        """)

        # Trade executions — mock or real, with P&L tracking
        c.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id    TEXT    REFERENCES signals(signal_id),
                status       TEXT    NOT NULL,           -- executed/failed/skipped/mock
                tx_hash      TEXT,                       -- null if mock
                token        TEXT    NOT NULL,
                direction    TEXT    NOT NULL,
                entry_price  REAL    NOT NULL DEFAULT 0,
                exit_price   REAL    DEFAULT NULL,       -- null until exit simulated
                size_usd     REAL    NOT NULL DEFAULT 0,
                pnl_usd      REAL    DEFAULT NULL,       -- null until exit
                pnl_pct      REAL    DEFAULT NULL,
                mock         INTEGER NOT NULL DEFAULT 1, -- 1 = mock, 0 = real
                settled      INTEGER NOT NULL DEFAULT 0, -- 1 = exit price resolved
                timestamp    TEXT    NOT NULL,
                settled_at   TEXT    DEFAULT NULL
            )
        """)

        # Short-lived price cache — token → USD price
        c.execute("""
            CREATE TABLE IF NOT EXISTS price_cache (
                token       TEXT    PRIMARY KEY,
                price_usd   REAL    NOT NULL,
                source      TEXT    NOT NULL DEFAULT 'mock',
                updated_at  TEXT    NOT NULL
            )
        """)

        # Multi-Agent Council - Member Registry
        c.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                name             TEXT PRIMARY KEY,
                role             TEXT NOT NULL,
                description      TEXT NOT NULL,
                reputation_score REAL NOT NULL DEFAULT 500.0,
                risk_score       REAL NOT NULL DEFAULT 0.0,
                active           INTEGER NOT NULL DEFAULT 1
            )
        """)

        # Council Votes - Records individual agent opinions
        c.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                signal_id    TEXT NOT NULL,
                agent_name   TEXT NOT NULL,
                direction    TEXT NOT NULL,
                confidence   REAL NOT NULL,
                reasoning    TEXT NOT NULL,
                timestamp    TEXT NOT NULL,
                FOREIGN KEY(signal_id) REFERENCES signals(signal_id),
                FOREIGN KEY(agent_name) REFERENCES agents(name)
            )
        """)

        # Agent Reputation History - Logs snapshots of agent score fluctuations
        c.execute("""
            CREATE TABLE IF NOT EXISTS reputation_history (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name       TEXT NOT NULL,
                reputation_score REAL NOT NULL,
                pnl_usd          REAL NOT NULL DEFAULT 0.0,
                timestamp        TEXT NOT NULL,
                FOREIGN KEY(agent_name) REFERENCES agents(name)
            )
        """)

        # Liquidity Scan Events
        c.execute("""
            CREATE TABLE IF NOT EXISTS liquidity_events (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash       TEXT    UNIQUE NOT NULL,
                pool          TEXT    NOT NULL,
                token0        TEXT    NOT NULL,
                token1        TEXT    NOT NULL,
                action        TEXT    NOT NULL,         -- lp_add / lp_remove
                amount_usd    REAL    NOT NULL DEFAULT 0,
                block_number  INTEGER NOT NULL,
                timestamp     TEXT    NOT NULL
            )
        """)

        # Indexes for common query patterns
        c.execute("CREATE INDEX IF NOT EXISTS idx_signals_ts        ON signals(timestamp DESC)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals(direction)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_trades_settled    ON trades(settled)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_whale_token       ON whale_events(token)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_whale_ts          ON whale_events(timestamp DESC)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_votes_sig         ON votes(signal_id)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_rep_agent         ON reputation_history(agent_name)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_liq_ts            ON liquidity_events(timestamp DESC)")

    # Seed the 5 agents if the table is empty
    _seed_agents_if_empty()
    logger.info("Database initialised at %s", DB_PATH)


# ─── Whale Events ─────────────────────────────────────────────────────────────

def save_whale_event(event: dict) -> bool:
    """
    Insert a whale event. Returns True if inserted, False if duplicate tx_hash.
    Expected keys: tx_hash, from_wallet, to_wallet, token, amount_usd,
                   amount_raw, action, block_number, wallet_score, timestamp
    """
    try:
        with get_conn() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO whale_events
                    (tx_hash, from_wallet, to_wallet, token, amount_usd,
                     amount_raw, action, block_number, wallet_score, timestamp)
                VALUES
                    (:tx_hash, :from_wallet, :to_wallet, :token, :amount_usd,
                     :amount_raw, :action, :block_number, :wallet_score, :timestamp)
            """, event)
            inserted = conn.execute(
                "SELECT changes()"
            ).fetchone()[0]
        return bool(inserted)
    except sqlite3.IntegrityError:
        return False


def get_recent_whale_events(limit: int = 50) -> list[dict]:
    """Returns the most recent whale events as a list of dicts."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM whale_events
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def get_whale_events_by_token(token: str, hours: int = 1) -> list[dict]:
    """Returns whale events for a specific token in the last N hours."""
    from datetime import timedelta
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM whale_events
            WHERE token = ? AND timestamp >= ?
            ORDER BY timestamp DESC
        """, (token, cutoff)).fetchall()
    return [dict(r) for r in rows]


# ─── Signals ──────────────────────────────────────────────────────────────────

def save_signal(signal: dict) -> bool:
    """
    Insert a trade signal. Returns True if inserted, False if duplicate signal_id.
    Expected keys: signal_id, token, direction, confidence, reasoning, urgency,
                   suggested_size_usd, whale_event_tx, acted_on, timestamp
    """
    try:
        with get_conn() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO signals
                    (signal_id, token, direction, confidence, reasoning,
                     urgency, suggested_size_usd, whale_event_tx, acted_on, timestamp)
                VALUES
                    (:signal_id, :token, :direction, :confidence, :reasoning,
                     :urgency, :suggested_size_usd, :whale_event_tx, :acted_on, :timestamp)
            """, signal)
            inserted = conn.execute("SELECT changes()").fetchone()[0]
        return bool(inserted)
    except sqlite3.IntegrityError:
        return False


def get_recent_signals(limit: int = 20) -> list[dict]:
    """Returns the most recent signals with their linked whale event data."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT s.*,
                   w.from_wallet, w.to_wallet, w.amount_usd AS whale_amount_usd,
                   w.action AS whale_action
            FROM signals s
            LEFT JOIN whale_events w ON s.whale_event_tx = w.tx_hash
            ORDER BY s.timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def mark_signal_acted_on(signal_id: str) -> None:
    """Mark a signal as acted on (trade placed)."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE signals SET acted_on = 1 WHERE signal_id = ?",
            (signal_id,)
        )


# ─── Trades ───────────────────────────────────────────────────────────────────

def save_trade(trade: dict) -> int:
    """
    Insert a trade record. Returns the new row ID.
    Expected keys: signal_id, status, tx_hash, token, direction,
                   entry_price, size_usd, mock, timestamp
    """
    with get_conn() as conn:
        cursor = conn.execute("""
            INSERT INTO trades
                (signal_id, status, tx_hash, token, direction,
                 entry_price, size_usd, mock, timestamp)
            VALUES
                (:signal_id, :status, :tx_hash, :token, :direction,
                 :entry_price, :size_usd, :mock, :timestamp)
        """, trade)
        return cursor.lastrowid


def settle_trade(trade_id: int, exit_price: float) -> dict:
    """
    Update a trade with its exit price and compute P&L.
    Returns the updated trade record.
    """
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM trades WHERE id = ?", (trade_id,)
        ).fetchone()
        if not row:
            raise ValueError(f"Trade id={trade_id} not found")
        trade = dict(row)

        if trade["direction"] == "BUY":
            pnl_pct = (exit_price - trade["entry_price"]) / trade["entry_price"]
        else:  # SELL / SHORT
            pnl_pct = (trade["entry_price"] - exit_price) / trade["entry_price"]

        pnl_usd = pnl_pct * trade["size_usd"]
        settled_at = datetime.utcnow().isoformat()

        conn.execute("""
            UPDATE trades
            SET exit_price  = ?,
                pnl_usd     = ?,
                pnl_pct     = ?,
                settled     = 1,
                settled_at  = ?
            WHERE id = ?
        """, (exit_price, pnl_usd, pnl_pct, settled_at, trade_id))

    trade.update(
        exit_price=exit_price,
        pnl_usd=pnl_usd,
        pnl_pct=pnl_pct,
        settled=1,
        settled_at=settled_at,
    )
    return trade


def get_unsettled_mock_trades() -> list[dict]:
    """Returns all mock trades that haven't been settled yet."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM trades
            WHERE mock = 1 AND settled = 0
            ORDER BY timestamp ASC
        """).fetchall()
    return [dict(r) for r in rows]


def get_recent_trades(limit: int = 50) -> list[dict]:
    """Returns recent trades joined with signal reasoning."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT t.*, s.reasoning, s.confidence
            FROM trades t
            LEFT JOIN signals s ON t.signal_id = s.signal_id
            ORDER BY t.timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]


# ─── Price Cache ──────────────────────────────────────────────────────────────

def upsert_price(token: str, price_usd: float, source: str = "agni") -> None:
    """Insert or update the cached price for a token."""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO price_cache (token, price_usd, source, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET
                price_usd  = excluded.price_usd,
                source     = excluded.source,
                updated_at = excluded.updated_at
        """, (token, price_usd, source, datetime.utcnow().isoformat()))


def get_cached_price(token: str) -> Optional[float]:
    """Returns the last cached price for a token, or None if not cached."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT price_usd FROM price_cache WHERE token = ?", (token,)
        ).fetchone()
    return row["price_usd"] if row else None


# ─── Agent Stats (Aggregated) ─────────────────────────────────────────────────

def get_agent_stats() -> dict:
    """
    Computes aggregate performance stats for the AgentIdentity dashboard.

    Returns:
        total_signals     int   — all signals generated
        acted_on          int   — signals where a trade was placed
        settled_trades    int   — trades with a known exit price
        winning_trades    int   — trades with pnl_usd > 0
        win_rate_pct      float — winning / settled * 100
        total_pnl_usd     float — sum of all settled P&L
        best_trade_usd    float — highest single-trade P&L
        worst_trade_usd   float — lowest single-trade P&L
        avg_confidence    float — mean signal confidence
        reputation_score  int   — 0-1000 derived from win rate
        buy_signals       int   — count of BUY signals
        sell_signals      int   — count of SELL signals
        hold_signals      int   — count of HOLD signals
    """
    with get_conn() as conn:
        sig = conn.execute("""
            SELECT
                COUNT(*)                              AS total_signals,
                SUM(acted_on)                         AS acted_on,
                AVG(confidence)                       AS avg_confidence,
                SUM(CASE WHEN direction='BUY'  THEN 1 ELSE 0 END) AS buy_signals,
                SUM(CASE WHEN direction='SELL' THEN 1 ELSE 0 END) AS sell_signals,
                SUM(CASE WHEN direction='HOLD' THEN 1 ELSE 0 END) AS hold_signals
            FROM signals
        """).fetchone()

        trd = conn.execute("""
            SELECT
                COUNT(*)                              AS settled_trades,
                SUM(CASE WHEN pnl_usd > 0 THEN 1 ELSE 0 END) AS winning_trades,
                COALESCE(SUM(pnl_usd), 0)             AS total_pnl_usd,
                COALESCE(MAX(pnl_usd), 0)             AS best_trade_usd,
                COALESCE(MIN(pnl_usd), 0)             AS worst_trade_usd
            FROM trades
            WHERE settled = 1
        """).fetchone()

    settled = trd["settled_trades"] or 0
    winning = trd["winning_trades"] or 0
    win_rate = (winning / settled * 100) if settled > 0 else 0.0
    reputation = int(win_rate * 10)  # 0-1000 scale

    return {
        "total_signals":   sig["total_signals"]   or 0,
        "acted_on":        sig["acted_on"]         or 0,
        "avg_confidence":  round(sig["avg_confidence"] or 0, 3),
        "buy_signals":     sig["buy_signals"]      or 0,
        "sell_signals":    sig["sell_signals"]     or 0,
        "hold_signals":    sig["hold_signals"]     or 0,
        "settled_trades":  settled,
        "winning_trades":  winning,
        "win_rate_pct":    round(win_rate, 1),
        "total_pnl_usd":   round(trd["total_pnl_usd"], 2),
        "best_trade_usd":  round(trd["best_trade_usd"], 2),
        "worst_trade_usd": round(trd["worst_trade_usd"], 2),
        "reputation_score": min(reputation, 1000),
    }


def get_pnl_timeseries() -> list[dict]:
    """
    Returns cumulative P&L timeseries for the PnLChart.
    Each entry: { timestamp, pnl_usd, cumulative_pnl_usd, token, direction }
    """
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT settled_at AS timestamp, pnl_usd, token, direction
            FROM trades
            WHERE settled = 1
            ORDER BY settled_at ASC
        """).fetchall()

    result = []
    cumulative = 0.0
    for row in rows:
        d = dict(row)
        cumulative += d["pnl_usd"] or 0
        d["cumulative_pnl_usd"] = round(cumulative, 2)
        result.append(d)
    return result


# ─── Multi-Agent Council & Liquidity Helpers ─────────────────────────────────

def _seed_agents_if_empty() -> None:
    """Populates the 5 council agents if not already seeded."""
    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0]
        if count == 0:
            agents = [
                ("WhaleHunter AI", "On-Chain Scanner", "Tracks large on-chain moves, transaction velocities, and whale clustering patterns."),
                ("LiquidityAI", "Pool Analyst", "Monitors Merchant Moe and Agni Finance pool ratios, TVL depths, and token ratio shifts."),
                ("MomentumAI", "Volume Strategist", "Identifies price momentum, daily moving averages, and volume spikes."),
                ("RiskGuard AI", "Threat Detector", "Analyzes wash-trading flags, contract logic vulnerabilities, and wallet age risks."),
                ("MacroAI", "Ecosystem Evaluator", "Monitors general market sentiment, gas price fluctuations, and ecosystem health.")
            ]
            conn.executemany("""
                INSERT INTO agents (name, role, description, reputation_score, risk_score)
                VALUES (?, ?, ?, 500.0, 0.0)
            """, agents)
            logger.info("Seeded 5 Council Agents into database")


def get_agents() -> list[dict]:
    """Retrieves all registered council agents and their stats."""
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM agents ORDER BY name ASC").fetchall()
    return [dict(r) for r in rows]


def update_agent_reputation(name: str, new_reputation: float, risk_score: float) -> None:
    """Updates an agent's reputation and risk score in the database."""
    with get_conn() as conn:
        conn.execute("""
            UPDATE agents
            SET reputation_score = ?, risk_score = ?
            WHERE name = ?
        """, (new_reputation, risk_score, name))


def save_vote(vote: dict) -> bool:
    """Saves a council member's vote details."""
    try:
        with get_conn() as conn:
            conn.execute("""
                INSERT INTO votes (signal_id, agent_name, direction, confidence, reasoning, timestamp)
                VALUES (:signal_id, :agent_name, :direction, :confidence, :reasoning, :timestamp)
            """, vote)
        return True
    except Exception as e:
        logger.error("Error saving council vote: %s", e)
        return False


def get_votes_for_signal(signal_id: str) -> list[dict]:
    """Returns all votes cast by the council for a given signal."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM votes
            WHERE signal_id = ?
            ORDER BY agent_name ASC
        """, (signal_id,)).fetchall()
    return [dict(r) for r in rows]


def save_liquidity_event(event: dict) -> bool:
    """Inserts a liquidity add/remove event into the DB."""
    try:
        with get_conn() as conn:
            conn.execute("""
                INSERT OR IGNORE INTO liquidity_events
                    (tx_hash, pool, token0, token1, action, amount_usd, block_number, timestamp)
                VALUES
                    (:tx_hash, :pool, :token0, :token1, :action, :amount_usd, :block_number, :timestamp)
            """, event)
            inserted = conn.execute("SELECT changes()").fetchone()[0]
        return bool(inserted)
    except Exception as e:
        logger.error("Error saving liquidity event: %s", e)
        return False


def get_recent_liquidity_events(limit: int = 50) -> list[dict]:
    """Returns the most recent liquidity scan events."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM liquidity_events
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def save_reputation_history(agent_name: str, score: float, pnl_usd: float) -> None:
    """Records a snapshot of an agent's reputation state."""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO reputation_history (agent_name, reputation_score, pnl_usd, timestamp)
            VALUES (?, ?, ?, datetime('now'))
        """, (agent_name, score, pnl_usd))


def get_reputation_history(agent_name: str, limit: int = 50) -> list[dict]:
    """Retrieves chronological reputation logs for a given agent."""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM reputation_history
            WHERE agent_name = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (agent_name, limit)).fetchall()
    return [dict(r) for r in rows]

