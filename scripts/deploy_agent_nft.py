"""
GhostWhale AI — Deploy Agent Identity NFT

Deploys AgentIdentity.sol to Mantle Testnet and mints GhostWhale-001.
Run: python scripts/deploy_agent_nft.py

Requirements:
  - PRIVATE_KEY in .env
  - solcx installed: pip install py-solc-x
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

TESTNET_RPC   = os.getenv("MANTLE_TESTNET_RPC", "https://rpc.sepolia.mantle.xyz")
PRIVATE_KEY   = os.getenv("PRIVATE_KEY", "")
AGENT_NAME    = "GhostWhale-001"
CONTRACT_PATH = Path(__file__).parent.parent / "contracts" / "AgentIdentity.sol"

if not PRIVATE_KEY:
    sys.exit("Error: PRIVATE_KEY not set in .env")

w3 = Web3(Web3.HTTPProvider(TESTNET_RPC))
account = w3.eth.account.from_key(PRIVATE_KEY)

print(f"Deployer: {account.address}")
print(f"RPC:      {TESTNET_RPC}")
print(f"Balance:  {w3.from_wei(w3.eth.get_balance(account.address), 'ether'):.4f} MNT")


def compile_contract() -> tuple[str, dict]:
    """Compile AgentIdentity.sol using solcx."""
    try:
        from solcx import compile_files, install_solc, set_solc_version  # type: ignore
        install_solc("0.8.20", show_progress=False)
        set_solc_version("0.8.20")
    except ImportError:
        sys.exit("Install py-solc-x: pip install py-solc-x")

    compiled = compile_files(
        [str(CONTRACT_PATH)],
        output_values=["abi", "bin"],
        solc_version="0.8.20",
        import_remappings=["@openzeppelin=./node_modules/@openzeppelin"],
    )

    key = f"{CONTRACT_PATH}:AgentIdentity"
    abi = compiled[key]["abi"]
    bytecode = compiled[key]["bin"]
    return bytecode, abi


def deploy(bytecode: str, abi: dict) -> str:
    """Deploy contract and return address."""
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce    = w3.eth.get_transaction_count(account.address)

    tx = contract.constructor().build_transaction({
        "from":     account.address,
        "nonce":    nonce,
        "gas":      3_000_000,
        "gasPrice": w3.to_wei("0.02", "gwei"),
        "chainId":  5003,  # Mantle Sepolia testnet
    })

    signed  = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print(f"Deploy tx: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    address = receipt["contractAddress"]
    print(f"✅ Contract deployed: {address}")
    return address, abi


def mint_agent(address: str, abi: dict) -> int:
    """Mint GhostWhale-001 agent NFT."""
    contract = w3.eth.contract(address=address, abi=abi)
    nonce    = w3.eth.get_transaction_count(account.address)

    tx = contract.functions.mintAgent(account.address, AGENT_NAME).build_transaction({
        "from":     account.address,
        "nonce":    nonce,
        "gas":      200_000,
        "gasPrice": w3.to_wei("0.02", "gwei"),
        "chainId":  5003,
    })

    signed  = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

    # Parse AgentMinted event
    event = contract.events.AgentMinted().process_receipt(receipt)[0]
    token_id = event["args"]["tokenId"]
    print(f"✅ Minted {AGENT_NAME} — Token ID: {token_id}")
    return token_id


def save_env(address: str, token_id: int) -> None:
    """Append deployment info to .env.example for reference."""
    env_path = Path(__file__).parent.parent / ".env"
    with open(env_path, "a") as f:
        f.write(f"\nAGENT_NFT_ADDRESS={address}\n")
        f.write(f"AGENT_TOKEN_ID={token_id}\n")
    print(f"📝 Updated .env with AGENT_NFT_ADDRESS and AGENT_TOKEN_ID")


if __name__ == "__main__":
    print("\n── Compiling contract ──")
    bytecode, abi = compile_contract()

    print("\n── Deploying to Mantle Testnet ──")
    address, abi = deploy(bytecode, abi)

    print("\n── Minting GhostWhale-001 ──")
    token_id = mint_agent(address, abi)

    save_env(address, token_id)
    print(f"\n🐋 Done! Explorer: https://explorer.sepolia.mantle.xyz/token/{address}?a={token_id}")
