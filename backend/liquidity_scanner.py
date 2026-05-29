"""
GhostWhale AI — Liquidity Scanner

Scans Merchant Moe and Agni Finance pools for:
  - LP Add (Mint event)
  - LP Remove (Burn event)
Updates the local database with liquidity shifts.
"""

import logging
from datetime import datetime, timezone
from web3 import Web3
from config import MANTLE_RPC, WATCHED_TOKENS
from database import save_liquidity_event

logger = logging.getLogger(__name__)

w3 = Web3(Web3.HTTPProvider(MANTLE_RPC, request_kwargs={"timeout": 10}))

# Topic hashes for Uniswap V2 / Moe pair events
MINT_TOPIC = "0x" + w3.keccak(text="Mint(address,uint256,uint256)").hex()
BURN_TOPIC = "0x" + w3.keccak(text="Burn(address,uint256,uint256,address)").hex()

# Known pools to watch on Mantle (DEX Pairs)
POOLS = {
    "USDT-WMNT-Moe": {
        "address": "0x4DA66A46b1Fdf0576394334C486bA188C0e9f168",
        "token0": "USDT",
        "token1": "WMNT",
        "decimals0": 6,
        "decimals1": 18
    },
    "mETH-WMNT-Moe": {
        "address": "0x5462D6cBDC1B036f6d0f666f7A6678229F8a609D",
        "token0": "mETH",
        "token1": "WMNT",
        "decimals0": 18,
        "decimals1": 18
    }
}

async def scan_liquidity_movements(from_block: int, to_block: int) -> list[dict]:
    """
    Query Mantle blocks for Mint/Burn logs across watched pools.
    """
    events = []
    
    for pool_name, meta in POOLS.items():
        pool_addr = Web3.to_checksum_address(meta["address"])
        
        for topic, action in [(MINT_TOPIC, "lp_add"), (BURN_TOPIC, "lp_remove")]:
            try:
                logs = w3.eth.get_logs({
                    "fromBlock": from_block,
                    "toBlock": to_block,
                    "address": pool_addr,
                    "topics": [topic]
                })
                
                for log in logs:
                    # Parse log data: amount0 (uint256), amount1 (uint256)
                    data_bytes = log["data"]
                    amount0 = int(data_bytes[0:32].hex(), 16) / (10 ** meta["decimals0"])
                    amount1 = int(data_bytes[32:64].hex(), 16) / (10 ** meta["decimals1"])
                    
                    # Compute approximate USD value
                    # Simplified: assume WMNT price = 0.65, USDT = 1.0
                    from database import get_cached_price
                    price0 = get_cached_price(meta["token0"]) or (1.0 if "USD" in meta["token0"] else 2000.0)
                    price1 = get_cached_price(meta["token1"]) or 0.65
                    
                    total_usd = (amount0 * price0) + (amount1 * price1)
                    tx_hash = log["transactionHash"].hex()
                    
                    try:
                        block = w3.eth.get_block(log["blockNumber"])
                        ts = datetime.fromtimestamp(block["timestamp"], tz=timezone.utc).isoformat()
                    except Exception:
                        ts = datetime.now(timezone.utc).isoformat()
                        
                    event_row = {
                        "tx_hash": tx_hash,
                        "pool": pool_name,
                        "token0": meta["token0"],
                        "token1": meta["token1"],
                        "action": action,
                        "amount_usd": round(total_usd, 2),
                        "block_number": log["blockNumber"],
                        "timestamp": ts
                    }
                    
                    save_liquidity_event(event_row)
                    events.append(event_row)
                    logger.info("💧 Liquidity event: %s | %s | $%.2f | tx=%s", action.upper(), pool_name, total_usd, tx_hash[:10])
                    
            except Exception as e:
                logger.debug("Failed scanning liquidity for %s: %s", pool_name, e)
                continue
                
    return events
