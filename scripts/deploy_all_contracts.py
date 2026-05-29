"""
GhostWhale AI — Deploy Smart Contract Suite

Compiles and deploys all GhostWhale core contracts to Mantle Testnet:
  1. AgentIdentity.sol
  2. SignalRegistry.sol
  3. AgentCouncil.sol
  4. TradeHistory.sol
  5. ReputationManager.sol
  6. TransparencyLedger.sol

Run: python scripts/deploy_all_contracts.py
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from web3 import Web3

# Handle encoding differences on Windows CLI
if hasattr(sys.stdout, "reconfigure"):
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

load_dotenv()

TESTNET_RPC = os.getenv("MANTLE_TESTNET_RPC", "https://rpc.sepolia.mantle.xyz")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
CONTRACTS_DIR = Path(__file__).parent.parent / "contracts"

w3 = Web3(Web3.HTTPProvider(TESTNET_RPC))

def compile_contract(contract_name: str, file_path: Path) -> tuple[str, dict]:
    """Compiles a Solidity contract using solcx."""
    try:
        from solcx import compile_files, install_solc, set_solc_version
        import solcx.install
        solcx.install.BINARY_DOWNLOAD_BASE = "https://binaries.soliditylang.org/{}-amd64/{}"
        install_solc("0.8.24", show_progress=False)
        set_solc_version("0.8.24")
    except ImportError:
        sys.exit("Error: py-solc-x is required. Install it using: pip install py-solc-x")

    print(f"Compiling {contract_name}...")
    compiled = compile_files(
        [str(file_path)],
        output_values=["abi", "bin"],
        solc_version="0.8.24",
        evm_version="cancun",
        import_remappings=["@openzeppelin=./node_modules/@openzeppelin"],
        optimize=True,
        optimize_runs=200,
        via_ir=True,
    )

    key = next(k for k in compiled.keys() if k.endswith(f":{contract_name}"))
    return compiled[key]["bin"], compiled[key]["abi"]


def deploy_contract(contract_name: str, bytecode: str, abi: dict, account, nonce: int) -> str:
    """Deploys a single compiled contract."""
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    gas_price = int(w3.eth.gas_price * 1.1)

    tx = contract.constructor().build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": 5003, # Mantle Sepolia chain ID
    })

    try:
        estimated_gas = w3.eth.estimate_gas(tx)
        tx["gas"] = int(estimated_gas * 1.2)
    except Exception:
        tx["gas"] = 3_000_000

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"Deploying {contract_name}... Tx hash: {tx_hash.hex()}")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt["status"] == 0:
        sys.exit(f"Error: Deployment of {contract_name} failed (reverted)")

    addr = receipt["contractAddress"]
    print(f"✅ {contract_name} deployed at: {addr}")
    return addr


def main():
    if not PRIVATE_KEY:
        print("⚠️ PRIVATE_KEY not found in .env. Running in Dry Run / Simulated Deployment mode.")
        print("Mock contract addresses will be generated.")
        mock_addresses = {
            "AGENT_NFT_ADDRESS": "0x51E2864C63E12D3EaE68874218C3558b4063c42B",
            "SIGNAL_REGISTRY_ADDRESS": "0xcDa86A272531e8640cD7F1a92c01839911B90bb0",
            "AGENT_COUNCIL_ADDRESS": "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
            "TRADE_HISTORY_ADDRESS": "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
            "REPUTATION_MANAGER_ADDRESS": "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
            "TRANSPARENCY_LEDGER_ADDRESS": "0x5bE26527e817998A7206475496fDE1E68957c5A6"
        }
        env_path = Path(__file__).parent.parent / ".env"
        with open(env_path, "a" if env_path.exists() else "w", encoding="utf-8") as f:
            f.write("\n# -- Dry Run Deployment Addresses --\n")
            for k, v in mock_addresses.items():
                f.write(f"{k}={v}\n")
        print("\n📝 Dry run complete. Saved mock addresses to .env")
        return

    account = w3.eth.account.from_key(PRIVATE_KEY)
    print(f"Deployer address: {account.address}")
    print(f"Deployer balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether'):.4f} MNT")

    contracts = [
        ("AgentIdentity", "AgentIdentity.sol"),
        ("SignalRegistry", "SignalRegistry.sol"),
        ("AgentCouncil", "AgentCouncil.sol"),
        ("TradeHistory", "TradeHistory.sol"),
        ("ReputationManager", "ReputationManager.sol"),
        ("TransparencyLedger", "TransparencyLedger.sol"),
    ]

    deployed_addresses = {}
    nonce = w3.eth.get_transaction_count(account.address, "pending")

    for contract_name, file_name in contracts:
        file_path = CONTRACTS_DIR / file_name
        bin_data, abi = compile_contract(contract_name, file_path)
        addr = deploy_contract(contract_name, bin_data, abi, account, nonce)
        deployed_addresses[contract_name] = addr
        nonce += 1

    # Update .env file
    env_path = Path(__file__).parent.parent / ".env"
    with open(env_path, "a", encoding="utf-8") as f:
        f.write("\n# -- Contract Deployments --\n")
        f.write(f"AGENT_NFT_ADDRESS={deployed_addresses['AgentIdentity']}\n")
        f.write(f"SIGNAL_REGISTRY_ADDRESS={deployed_addresses['SignalRegistry']}\n")
        f.write(f"AGENT_COUNCIL_ADDRESS={deployed_addresses['AgentCouncil']}\n")
        f.write(f"TRADE_HISTORY_ADDRESS={deployed_addresses['TradeHistory']}\n")
        f.write(f"REPUTATION_MANAGER_ADDRESS={deployed_addresses['ReputationManager']}\n")
        f.write(f"TRANSPARENCY_LEDGER_ADDRESS={deployed_addresses['TransparencyLedger']}\n")

    print("\n🎉 Deployment Suite executed successfully. Addresses saved to .env")

if __name__ == "__main__":
    main()
