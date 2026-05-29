"""
GhostWhale AI — Risk Engine

Detects suspicious patterns including:
  - Wash trading (direct loops, cyclical transfers)
  - Manipulation flags (high frequency spikes)
  - Smart money risk profiles
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Simple in-memory tracker to detect cyclical wash-trading loops
# format: wallet_address -> list of recent transfers (recipient, timestamp)
_TRANSFER_HISTORY: Dict[str, list] = {}

def analyze_transaction_risk(
    from_wallet: str,
    to_wallet: str,
    amount_usd: float,
    token: str,
    history: list
) -> Dict[str, Any]:
    """
    Evaluates risk metrics of a transaction.
    Returns: risk_score (0-100), wash_trade_detected (bool), reasoning (str)
    """
    risk_score = 10
    wash_trade_detected = False
    reasons = []

    # 1. Direct self-transfers
    if from_wallet.lower() == to_wallet.lower():
        risk_score += 50
        wash_trade_detected = True
        reasons.append("Direct transfer to self (Zero-value utility swap)")

    # 2. Cyclical loop detection (A -> B -> A)
    # Record current transfer
    from_lower = from_wallet.lower()
    to_lower = to_wallet.lower()
    
    if from_lower not in _TRANSFER_HISTORY:
        _TRANSFER_HISTORY[from_lower] = []
    _TRANSFER_HISTORY[from_lower].append(to_lower)
    
    # Cap memory size
    if len(_TRANSFER_HISTORY[from_lower]) > 5:
        _TRANSFER_HISTORY[from_lower].pop(0)

    # Check reverse: did to_wallet recently send to from_wallet?
    if to_lower in _TRANSFER_HISTORY and from_lower in _TRANSFER_HISTORY[to_lower]:
        risk_score += 60
        wash_trade_detected = True
        reasons.append("Cyclical round-trip transfer detected (potential wash trading)")

    # 3. Frequency check
    tx_count = len(history)
    if tx_count > 15:
        # High velocity could indicate bots or program execution
        risk_score += 15
        reasons.append("High-velocity transaction frequency from single wallet source")

    # 4. Large single size risk
    if amount_usd >= 100_000:
        risk_score += 10
        reasons.append("Large size slippage risk (>=$100K transaction)")

    # Limit risk score to 100
    risk_score = min(risk_score, 100)
    reasoning_str = "; ".join(reasons) if reasons else "Nominal risk profile verified."

    return {
        "risk_score": float(risk_score),
        "wash_trade_detected": wash_trade_detected,
        "reasoning": reasoning_str
    }
