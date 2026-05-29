"""
GhostWhale AI — Reputation Engine

Evaluates agent voting records after trade settlements:
  - Updates database reputation scores (0-1000)
  - Records score history
  - Syncs metrics on-chain using web3.py (when private key is set)
"""

import logging
from datetime import datetime, timezone
from web3 import Web3
from config import MANTLE_RPC, PRIVATE_KEY
from database import get_agents, update_agent_reputation, save_reputation_history, get_votes_for_signal

logger = logging.getLogger(__name__)

w3 = Web3(Web3.HTTPProvider(MANTLE_RPC))

async def evaluate_settled_trade_reputation(trade: dict) -> None:
    """
    Called when a trade is settled. Compares agent votes against trade outcome
    and adjusts agent reputation scores.
    """
    signal_id = trade.get("signal_id")
    pnl_usd = trade.get("pnl_usd", 0.0) or 0.0
    direction = trade.get("direction") # BUY / SELL
    trade_won = pnl_usd > 0.0
    
    logger.info("📈 Reputation Engine triggered for trade id %s | Win: %s | PnL: $%.2f", trade.get("id"), trade_won, pnl_usd)

    # Fetch votes cast for this signal
    votes = get_votes_for_signal(signal_id)
    if not votes:
        logger.debug("No votes found in DB for signal %s", signal_id)
        return

    # Fetch current agents list
    agents = {a["name"]: a for a in get_agents()}

    for vote in votes:
        agent_name = vote["agent_name"]
        agent_vote = vote["direction"]
        
        if agent_name not in agents:
            continue
            
        current_score = agents[agent_name]["reputation_score"]
        current_risk = agents[agent_name]["risk_score"]

        # Simple update rule:
        # If agent voted in the direction of the trade and the trade won -> reward
        # If agent voted opposite to trade and trade won -> penalise
        # If agent voted same as trade and trade lost -> penalise
        # If agent voted opposite and trade lost -> reward
        # If agent voted HOLD -> minor penalty or neutral
        
        voted_with_trade = (agent_vote == direction)
        
        score_delta = 0
        risk_delta = 0
        voted_correctly = False

        if trade_won:
            if voted_with_trade:
                score_delta = 15
                risk_delta = -2
                voted_correctly = True
            elif agent_vote == "HOLD":
                score_delta = -2
                risk_delta = 0
            else:
                score_delta = -15
                risk_delta = 5
        else: # Trade lost
            if voted_with_trade:
                score_delta = -15
                risk_delta = 5
            elif agent_vote == "HOLD":
                score_delta = 2
                risk_delta = -1
                voted_correctly = True
            else:
                score_delta = 10
                risk_delta = -2
                voted_correctly = True

        new_score = min(max(current_score + score_delta, 0.0), 1000.0)
        new_risk = min(max(current_risk + risk_delta, 0.0), 100.0)

        # 1. Update database
        update_agent_reputation(agent_name, new_score, new_risk)
        save_reputation_history(agent_name, new_score, pnl_usd)
        
        logger.info("🤖 Agent %s reputation: %.1f -> %.1f (Risk: %.1f%%)", agent_name, current_score, new_score, new_risk)

        # 2. Sync to on-chain ReputationManager / AgentIdentity NFT
        if PRIVATE_KEY:
            try:
                # We fetch address of the contract from env or config
                import os
                rep_contract_addr = os.getenv("REPUTATION_MANAGER_ADDRESS", "")
                if rep_contract_addr:
                    account = w3.eth.account.from_key(PRIVATE_KEY)
                    # Simple stub for ABI of updateReputation(string,uint256,uint256,bool)
                    abi = [{
                        "inputs": [
                            {"name": "agentName", "type": "string"},
                            {"name": "newScore", "type": "uint256"},
                            {"name": "riskScore", "type": "uint256"},
                            {"name": "votedCorrectly", "type": "bool"}
                        ],
                        "name": "updateReputation",
                        "outputs": [],
                        "stateMutability": "nonpayable",
                        "type": "function"
                    }]
                    contract = w3.eth.contract(address=Web3.to_checksum_address(rep_contract_addr), abi=abi)
                    nonce = w3.eth.get_transaction_count(account.address, 'pending')
                    tx = contract.functions.updateReputation(
                        agent_name,
                        int(new_score),
                        int(new_risk),
                        voted_correctly
                    ).build_transaction({
                        "from": account.address,
                        "nonce": nonce,
                        "gasPrice": int(w3.eth.gas_price * 1.1)
                    })
                    signed = account.sign_transaction(tx)
                    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
                    logger.info("⛓ Sent reputation update on-chain: %s", tx_hash.hex())
            except Exception as e:
                logger.warning("Failed to sync agent %s reputation on-chain: %s", agent_name, e)
