// GhostWhale AI — Shared TypeScript Types

export interface WhaleEvent {
  id: number
  tx_hash: string
  from_wallet: string
  to_wallet: string
  token: string
  amount_usd: number
  amount_raw: string
  action: 'buy' | 'sell' | 'transfer' | 'lp_add' | 'lp_remove'
  block_number: number
  wallet_score: number
  timestamp: string
  // Joined from signals
  from_wallet_display?: string
  to_wallet_display?: string
  // Advanced Blockchain Telemetry Fields
  gas_fee?: string
  chain_source?: string
  smart_money_tier?: string
  ai_reasoning?: string
  explorer_link?: string
  tx_type?: string
  wallet_label?: string
  sparkline_data?: number[]
}

export interface Signal {
  id: number
  signal_id: string
  token: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  suggested_size_usd: number
  whale_event_tx: string
  acted_on: number
  timestamp: string
  // Joined fields from whale_events
  from_wallet?: string
  to_wallet?: string
  whale_amount_usd?: number
  whale_action?: string
  votes?: any[]
}

export interface Trade {
  id: number
  signal_id: string
  status: 'mock' | 'executed' | 'skipped' | 'failed'
  tx_hash: string | null
  token: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  entry_price: number
  exit_price: number | null
  size_usd: number
  pnl_usd: number | null
  pnl_pct: number | null
  mock: number
  settled: number
  timestamp: string
  settled_at: string | null
  reasoning?: string
  confidence?: number
}

export interface AgentStats {
  total_signals: number
  acted_on: number
  avg_confidence: number
  buy_signals: number
  sell_signals: number
  hold_signals: number
  settled_trades: number
  winning_trades: number
  win_rate_pct: number
  total_pnl_usd: number
  best_trade_usd: number
  worst_trade_usd: number
  reputation_score: number
}

export interface AgentIdentity {
  name: string
  version: string
  description: string
  image_url: string
  created_at: string
  network: string
  chain_id: number
  mode: 'MOCK' | 'LIVE'
  standard: string
  token_id: number
  nft_address: string
  explorer_url: string | null
  reputation_score: number
  win_rate_pct: number
  total_signals: number
  total_pnl_usd: number
  best_trade_usd: number
  settled_trades: number
  winning_trades: number
  fetched_at: string
}

export interface PnLPoint {
  timestamp: string
  pnl_usd: number
  cumulative_pnl_usd: number
  token: string
  direction: string
}

export interface RpcStatus {
  connected: boolean
  chain_id?: number
  latest_block?: number
  rpc?: string
  error?: string
}
