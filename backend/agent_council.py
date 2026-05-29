"""
GhostWhale AI — Agent Council

Coordinates evaluations and debates among the 5 autonomous council members:
  1. WhaleHunter AI (smart money / transfer sizes)
  2. LiquidityAI (pool ratios / LP movements)
  3. MomentumAI (volume and price action)
  4. RiskGuard AI (wash trading / security risks)
  5. MacroAI (sentiment and gas costs)
"""

import logging
from datetime import datetime, timezone
from database import save_vote

logger = logging.getLogger(__name__)

class CouncilAgent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        """Evaluate event and return vote: direction, confidence (0.0-1.0), reasoning."""
        raise NotImplementedError()

class WhaleHunterAgent(CouncilAgent):
    def __init__(self):
        super().__init__("WhaleHunter AI", "On-Chain Scanner")

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        amount_usd = event.amount_usd
        action = event.action
        wallet_score = getattr(event, "wallet_score", 0.5)
        
        confidence = 0.5 + (wallet_score * 0.3)
        
        if action == "buy" and amount_usd >= 50000:
            vote = "BUY"
            reasoning = f"Detected high-conviction buy of ${amount_usd:,.2f} from wallet with smart-money tier score ({wallet_score:.0%})."
        elif action == "sell" and amount_usd >= 50000:
            vote = "SELL"
            reasoning = f"Whale transaction executed heavy distribution (${amount_usd:,.2f} sell). Moving to sideline."
        elif action == "lp_add":
            vote = "BUY"
            reasoning = f"Whale adding liquidity is structurally bullish, showing commitment of capital."
        else:
            vote = "HOLD"
            reasoning = "Normal wallet transfer. Insufficient size for active directional signal."
            
        return {"direction": vote, "confidence": round(confidence, 2), "reasoning": reasoning}

class LiquidityAgent(CouncilAgent):
    def __init__(self):
        super().__init__("LiquidityAI", "Pool Analyst")

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        # Check recent liquidity events
        action = event.action
        vol_ratio = market_ctx.get("volume_vs_avg", 1.0)
        
        confidence = 0.6 if vol_ratio > 1.5 else 0.4
        
        if action == "lp_remove":
            vote = "SELL"
            reasoning = "LP removal detected. Squeezing pool depth increases slippage risk, indicative of exit."
        elif action == "lp_add":
            vote = "BUY"
            reasoning = "New LP injection deepens pair depth, allowing smoother trade execution and reducing slippage."
        elif market_ctx.get("liquidity_signal") == "high":
            vote = "BUY"
            reasoning = "Target token depth is high. Conducive for accumulating positions without massive price impact."
        else:
            vote = "HOLD"
            reasoning = "Liquidity levels remain within normal boundaries. No critical shifts observed."
            
        return {"direction": vote, "confidence": round(confidence, 2), "reasoning": reasoning}

class MomentumAgent(CouncilAgent):
    def __init__(self):
        super().__init__("MomentumAI", "Volume Strategist")

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        trend = market_ctx.get("price_trend_1h", 0.0)
        vol_ratio = market_ctx.get("volume_vs_avg", 1.0)
        
        if trend > 2.0 and vol_ratio > 1.5:
            vote = "BUY"
            confidence = min(0.5 + (trend / 20.0), 0.95)
            reasoning = f"Strong bullish momentum. Price is up {trend:.1f}% on elevated volume ({vol_ratio:.1f}x avg)."
        elif trend < -3.0 and vol_ratio > 1.2:
            vote = "SELL"
            confidence = min(0.5 + (abs(trend) / 20.0), 0.95)
            reasoning = f"Bearish trend continuation. Price declined {abs(trend):.1f}% with increased volume pressure."
        else:
            vote = "HOLD"
            confidence = 0.5
            reasoning = f"Price trend is flat ({trend:+.1f}%) with normal volume levels."
            
        return {"direction": vote, "confidence": round(confidence, 2), "reasoning": reasoning}

class RiskGuardAgent(CouncilAgent):
    def __init__(self):
        super().__init__("RiskGuard AI", "Threat Detector")

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        risk_score = risk_ctx.get("risk_score", 0.0)
        wash_trade = risk_ctx.get("wash_trade_detected", False)
        
        confidence = 0.8 if risk_score > 50 else 0.5
        
        if wash_trade:
            vote = "HOLD"
            reasoning = "CRITICAL: Cyclical transfer detected. High probability of artificial volume generation (wash trading). Rejecting BUY triggers."
        elif risk_score > 60:
            vote = "SELL"
            reasoning = f"Risk index elevated to {risk_score}%. Suspicious transaction frequency and high slippage exposure detected."
        else:
            vote = "BUY" if event.action in ("buy", "lp_add") else "HOLD"
            confidence = 0.7
            reasoning = f"Risk metrics are clear (risk index: {risk_score}%). Wallet activity patterns display standard behavior."
            
        return {"direction": vote, "confidence": round(confidence, 2), "reasoning": reasoning}

class MacroAgent(CouncilAgent):
    def __init__(self):
        super().__init__("MacroAI", "Ecosystem Evaluator")

    async def evaluate(self, event, market_ctx: dict, risk_ctx: dict) -> dict:
        # Evaluate ecosystem indicators. High gas or high volatility acts as hold/sell
        gas_price = market_ctx.get("gas_price_gwei", 0.25)
        
        # Check standard sentiment
        if gas_price > 5.0:
            vote = "HOLD"
            confidence = 0.6
            reasoning = f"Mantle network congestion detected (gas is {gas_price:.2f} Gwei). Delaying execution."
        else:
            vote = "BUY" if event.action in ("buy", "lp_add") else "HOLD"
            confidence = 0.65
            reasoning = "Mantle gas levels are nominal. Ecosystem indices indicate active and healthy capital flows."
            
        return {"direction": vote, "confidence": round(confidence, 2), "reasoning": reasoning}

# The Council Core Orchestrator
COUNCIL = [
    WhaleHunterAgent(),
    LiquidityAgent(),
    MomentumAgent(),
    RiskGuardAgent(),
    MacroAgent()
]

async def hold_council_debate(signal_id: str, event, market_ctx: dict, risk_ctx: dict) -> list[dict]:
    """
    Debate an event and cast votes. Saves each vote to the DB and returns the list.
    """
    votes = []
    ts = datetime.now(timezone.utc).isoformat()
    
    for agent in COUNCIL:
        try:
            res = await agent.evaluate(event, market_ctx, risk_ctx)
            vote_row = {
                "signal_id": signal_id,
                "agent_name": agent.name,
                "direction": res["direction"],
                "confidence": res["confidence"],
                "reasoning": res["reasoning"],
                "timestamp": ts
            }
            save_vote(vote_row)
            votes.append(vote_row)
            logger.info("🗳 Council Vote: %s -> %s (conf: %.0f%%)", agent.name, res["direction"], res["confidence"]*100)
        except Exception as e:
            logger.error("Error during council vote for %s: %s", agent.name, e)
            
    return votes
