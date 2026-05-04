"""
GhostWhale AI — Configuration
All constants, RPC endpoints, contract addresses, and thresholds.
Sensitive values are loaded from environment variables via python-dotenv.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ─── Mantle Network ───────────────────────────────────────────────────────────
MANTLE_RPC: str = os.getenv("MANTLE_RPC", "https://rpc.mantle.xyz")
MANTLE_TESTNET_RPC: str = os.getenv("MANTLE_TESTNET_RPC", "https://rpc.sepolia.mantle.xyz")
MANTLE_CHAIN_ID: int = 5000
MANTLE_TESTNET_CHAIN_ID: int = 5003
MANTLE_EXPLORER: str = "https://mantlescan.xyz"

# ─── DEX Addresses (Mainnet) ──────────────────────────────────────────────────
# Merchant Moe — primary DEX
MERCHANT_MOE_ROUTER: str = "0xeaEE7EE68874218c3558b40063c42B82D3E7232a"
MERCHANT_MOE_LB_ROUTER: str = "0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a"
MERCHANT_MOE_FACTORY: str = "0x5bEf015CA9424A7C07B68490616a4C1F094BEdEc"

# Agni Finance — fallback DEX + price oracle
AGNI_SUBGRAPH: str = os.getenv(
    "AGNI_SUBGRAPH",
    "https://subgraph.mantle.xyz/subgraphs/name/agni/exchange-v3",
)
AGNI_FACTORY: str = "0x25780dc8Fc3cfBD75F33bFDAB65e969b603b2035"

# ─── Token Addresses (Mantle Mainnet) ─────────────────────────────────────────
WATCHED_TOKENS: dict[str, str] = {
    # Wrapped MNT (ERC-20 representation of native MNT)
    "WMNT":  "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    # Mantle Staked ETH (mETH Protocol)
    "mETH":  "0xcDA86A272531e8640cD7F1a92c01839911B90bb0",
    # Bridged USDT on Mantle
    "USDT":  "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
    # Ondo US Dollar Yield
    "USDY":  "0x5bE26527e817998A7206475496fDE1E68957c5A6",
    # Bridged USDC on Mantle
    "USDC":  "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    # Wrapped ETH on Mantle
    "WETH":  "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
}

# Reverse lookup: address → symbol
TOKEN_SYMBOLS: dict[str, str] = {v.lower(): k for k, v in WATCHED_TOKENS.items()}

# ─── Mock Prices (USD) — used when live price fetch fails ──────────────────────
# Updated periodically; not used for real trading decisions
MOCK_PRICES_USD: dict[str, float] = {
    "WMNT":  1.10,
    "mETH":  3800.0,
    "USDT":  1.00,
    "USDY":  1.05,
    "USDC":  1.00,
    "WETH":  3800.0,
}

# ─── Whale Detection Thresholds ───────────────────────────────────────────────
WHALE_THRESHOLD_USD: float = float(os.getenv("WHALE_THRESHOLD_USD", "50000"))
# Minimum native MNT value (wei) to consider a tx for native transfer tracking
WHALE_THRESHOLD_MNT: int = int(45_000 / 1.10 * 1e18)  # ~$50k in MNT wei

# ─── Signal Engine ────────────────────────────────────────────────────────────
MIN_SIGNAL_CONFIDENCE: float = float(os.getenv("MIN_SIGNAL_CONFIDENCE", "0.65"))
HIGH_CONFIDENCE_THRESHOLD: float = 0.80   # Triggers Telegram alert
MAX_TRADE_SIZE_USD: float = float(os.getenv("MAX_TRADE_SIZE_USD", "10000"))

# Score weights for confidence calculation
WEIGHT_WALLET_SCORE: float = 0.40
WEIGHT_VOLUME_SPIKE: float = 0.25
WEIGHT_PRICE_TREND:  float = 0.20
WEIGHT_WHALE_CLUSTER: float = 0.15

# Wallet scoring heuristics
WALLET_AGE_MAX_BLOCKS: int = 100_000     # ~14 days on Mantle
TRUSTED_TX_COUNT_MIN: int = 50           # Wallets with 50+ txs get age bonus

# ─── Scanning ─────────────────────────────────────────────────────────────────
SCAN_INTERVAL_SECONDS: int = 15          # Poll every 15s
SCAN_BLOCK_DEPTH: int = 3               # Look back N blocks each poll
MAX_SEEN_TXS_CACHE: int = 10_000        # Dedup cache size

# ─── Trade Execution ──────────────────────────────────────────────────────────
MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() == "true"
SLIPPAGE_BPS: int = 50                  # 0.5% slippage tolerance
MOCK_EXIT_DELAY_SECONDS: int = 1800     # Simulate exit after 30 min

# Private key — only used in REAL mode, never logged
PRIVATE_KEY: str = os.getenv("PRIVATE_KEY", "")

# ─── Agent Identity (ERC-8004) ────────────────────────────────────────────────
AGENT_NAME: str = "GhostWhale-001"
AGENT_NFT_ADDRESS: str = os.getenv("AGENT_NFT_ADDRESS", "")
AGENT_TOKEN_ID: int = int(os.getenv("AGENT_TOKEN_ID", "0"))

# ─── Telegram ─────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_ENABLED: bool = bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)

# ─── API Server ───────────────────────────────────────────────────────────────
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))

# ─── Database ─────────────────────────────────────────────────────────────────
DB_PATH: str = os.getenv("DB_PATH", "ghostwhale.db")

# ─── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
