"""
GhostWhale AI — Agent Identity (ERC-8004)

Provides the on-chain identity metadata for GhostWhale-001.
Reads live stats from the DB and combines with static NFT metadata.
"""

import logging
from datetime import datetime, timezone

from database import get_agent_stats
from config import (
    AGENT_NAME,
    AGENT_NFT_ADDRESS,
    AGENT_TOKEN_ID,
    MANTLE_EXPLORER,
    MOCK_MODE,
)

logger = logging.getLogger(__name__)

# Static metadata — set once at deploy time
_AGENT_METADATA = {
    "name":        AGENT_NAME,
    "version":     "1.0.0",
    "description": (
        "GhostWhale AI is an autonomous on-chain trading agent deployed on Mantle Network. "
        "It tracks large wallet movements, scores them using a multi-factor AI engine, "
        "and generates transparent trade signals with public reasoning."
    ),
    "image_url":   "/agent-badge.svg",   # Served by frontend
    "created_at":  "2026-05-01T00:00:00Z",
    "network":     "Mantle Mainnet",
    "chain_id":    5000,
    "mode":        "MOCK" if MOCK_MODE else "LIVE",
    "standard":    "ERC-8004",
}


def get_agent_nft_data() -> dict:
    """
    Returns the full ERC-8004 agent identity payload for the frontend.

    Merges static metadata with live performance stats from the DB.
    """
    stats = get_agent_stats()

    nft_address_display = AGENT_NFT_ADDRESS or "Not deployed (hackathon demo)"
    explorer_url = (
        f"{MANTLE_EXPLORER}/token/{AGENT_NFT_ADDRESS}?a={AGENT_TOKEN_ID}"
        if AGENT_NFT_ADDRESS
        else None
    )

    return {
        **_AGENT_METADATA,
        "token_id":         AGENT_TOKEN_ID,
        "nft_address":      nft_address_display,
        "explorer_url":     explorer_url,
        "reputation_score": stats["reputation_score"],
        "win_rate_pct":     stats["win_rate_pct"],
        "total_signals":    stats["total_signals"],
        "total_pnl_usd":    stats["total_pnl_usd"],
        "best_trade_usd":   stats["best_trade_usd"],
        "settled_trades":   stats["settled_trades"],
        "winning_trades":   stats["winning_trades"],
        "fetched_at":       datetime.now(tz=timezone.utc).isoformat(),
    }
