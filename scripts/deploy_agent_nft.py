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

# Ensure Windows terminal doesn't crash on printing emojis/unicode characters
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

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
        import solcx.install
        solcx.install.BINARY_DOWNLOAD_BASE = "https://binaries.soliditylang.org/{}-amd64/{}"
        install_solc("0.8.24", show_progress=False)
        set_solc_version("0.8.24")
    except ImportError:
        sys.exit("Install py-solc-x: pip install py-solc-x")

    compiled = compile_files(
        [str(CONTRACT_PATH)],
        output_values=["abi", "bin"],
        solc_version="0.8.24",
        evm_version="cancun",
        import_remappings=["@openzeppelin=./node_modules/@openzeppelin"],
        optimize=True,
        optimize_runs=200,
        via_ir=True,
    )

    key = next(k for k in compiled.keys() if k.endswith(":AgentIdentity"))
    abi = compiled[key]["abi"]
    bytecode = compiled[key]["bin"]
    return bytecode, abi


def deploy(bytecode: str, abi: dict, nonce: int) -> str:
    """Deploy contract and return address."""
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    gas_price = int(w3.eth.gas_price * 1.1)

    tx = contract.constructor().build_transaction({
        "from":     account.address,
        "nonce":    nonce,
        "gasPrice": gas_price,
        "chainId":  5003,  # Mantle Sepolia testnet
    })

    try:
        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)
    except Exception as e:
        print(f"Gas estimation failed: {e}. Falling back to 3,000,000 gas limit.")
        tx["gas"] = 3_000_000

    signed  = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"Deploy tx: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt["status"] == 0:
        sys.exit("Error: Contract deployment transaction reverted!")

    address = receipt["contractAddress"]
    print(f"✅ Contract deployed: {address}")
    return address, abi


def mint_agent(address: str, abi: dict, nonce: int) -> int:
    """Mint GhostWhale-001 agent NFT."""
    contract = w3.eth.contract(address=address, abi=abi)
    gas_price = int(w3.eth.gas_price * 1.1)

    tx = contract.functions.mintAgent(account.address, AGENT_NAME).build_transaction({
        "from":     account.address,
        "nonce":    nonce,
        "gasPrice": gas_price,
        "chainId":  5003,
    })

    try:
        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)
    except Exception as e:
        print(f"Gas estimation failed: {e}. Falling back to 200,000 gas limit.")
        tx["gas"] = 200_000

    signed  = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

    if receipt["status"] == 0:
        sys.exit("Error: Agent minting transaction reverted!")

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

    # Get start nonce to manage sequential transactions reliably
    start_nonce = w3.eth.get_transaction_count(account.address, 'pending')

    print("\n── Deploying to Mantle Testnet ──")
    address, abi = deploy(bytecode, abi, start_nonce)

    print("\n── Minting GhostWhale-001 ──")
    token_id = mint_agent(address, abi, start_nonce + 1)

    save_env(address, token_id)
    print(f"\n🐋 Done! Explorer: https://explorer.sepolia.mantle.xyz/token/{address}?a={token_id}")
