import { useEffect, useState, useCallback, useRef } from 'react'
import type { Signal, WhaleEvent, Trade, AgentStats, AgentIdentity, PnLPoint, RpcStatus } from '@/types'
import { api } from '@/lib/api'

import LiveTicker from '@/components/LiveTicker'
import WhaleFeed from '@/components/WhaleFeed'
import SignalCard from '@/components/SignalCard'
import AgentIdentityCard from '@/components/AgentIdentity'
import PnLChart from '@/components/PnLChart'
import NetworkMap from '@/components/NetworkMap'
import AIReasoningEngine from '@/components/AIReasoningEngine'
import ProfitableTrades from '@/components/ProfitableTrades'
import AIAvatar from '@/components/AIAvatar'
import { audio } from '@/lib/audio'

// ── DEMO DATA — always available, no backend needed ─────────────────────────
const DEMO_TOKENS = ['mETH', 'WMNT', 'AGNI', 'MOE', 'USDY']

const REASONING_SCRIPTS = [
  { text: '🔍 Scanning Mantle chain for anomalous accumulation patterns...', color: 'var(--accent-2)' },
  { text: '🐋 SMART WALLET DETECTED: 0x7cC...29d has accumulated mETH 3× in 6 hours.', color: 'var(--accent)' },
  { text: '📊 Liquidity imbalance detected on Merchant Moe pool — bid side 40% thinner than normal.', color: 'var(--accent-yellow)' },
  { text: '🧠 Cross-referencing with 180-day whale wallet database...', color: 'var(--accent-2)' },
  { text: '⚡ Social sentiment rising: #mETH trending on-chain analytics dashboards.', color: 'var(--accent)' },
  { text: '📈 Historical pattern match: 87% similar setups resulted in +8–15% move within 4h.', color: 'var(--accent)' },
  { text: '🎯 AI Signal generated: BUY mETH | Confidence: 92% | Size: $15,000 | Target: +12%', color: 'var(--accent)' },
  { text: '✅ Trade executed: Entry at $3,812.50 | Stop Loss: $3,697 | Target: $4,269', color: 'var(--accent)' },
  { text: '⚠️ New whale wallet 0xF3a...11c entering AGNI position — monitoring...', color: 'var(--accent-yellow)' },
  { text: '🔴 SELL signal triggered on MOE — whale exit detected, dumping $240K.', color: 'var(--accent-red)' },
  { text: '💰 Trade closed: mETH +$1,847 (+12.2%) | GhostWhale Reputation +8pts', color: 'var(--accent)' },
]

function makeMockWhale(token?: string): WhaleEvent {
  const isBuy = Math.random() > 0.35
  const tok = token ?? DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)]
  const wallet = '0x' + Math.random().toString(16).slice(2, 10).toUpperCase()
  return {
    id: Math.random(),
    tx_hash: '0x' + Math.random().toString(16).slice(2),
    from_wallet: wallet,
    to_wallet: '0x' + Math.random().toString(16).slice(2, 10).toUpperCase(),
    token: tok,
    amount_usd: 80_000 + Math.random() * 650_000,
    amount_raw: '0',
    action: (isBuy ? 'buy' : 'sell') as 'buy' | 'sell',
    block_number: 70_000_000 + Math.floor(Math.random() * 100_000),
    wallet_score: 0.65 + Math.random() * 0.35,
    timestamp: new Date().toISOString(),
  }
}

function makeMockTrade(isBuy: boolean, token: string, amount: number): Trade {
  const pnl = amount * (0.04 + Math.random() * 0.12)
  return {
    id: Math.random(),
    signal_id: Math.random().toString(),
    tx_hash: null,
    token,
    direction: (isBuy ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
    size_usd: amount * 0.1,
    entry_price: 100,
    exit_price: 112,
    pnl_usd: pnl,
    pnl_pct: pnl / (amount * 0.1) * 100,
    mock: 1,
    settled: 1,
    status: 'mock' as 'mock',
    timestamp: new Date().toISOString(),
    settled_at: new Date().toISOString(),
  }
}

// Seed 8 initial demo whales so the screen is never blank
const INITIAL_WHALES: WhaleEvent[] = Array.from({ length: 8 }, (_, i) => {
  const w = makeMockWhale(DEMO_TOKENS[i % DEMO_TOKENS.length])
  // Spread them across past 90 minutes
  w.timestamp = new Date(Date.now() - (8 - i) * 600_000 - Math.random() * 300_000).toISOString()
  return w
})

const INITIAL_TRADES: Trade[] = INITIAL_WHALES.slice(0, 5).map(w =>
  makeMockTrade(w.action === 'buy', w.token, w.amount_usd)
)

const INITIAL_PNL: PnLPoint[] = (() => {
  let cum = 0
  return Array.from({ length: 20 }, (_, i) => {
    const pnl = (Math.random() - 0.3) * 1200
    cum += pnl
    const ts = new Date(Date.now() - (20 - i) * 3_600_000)
    return { timestamp: ts.toISOString(), pnl_usd: pnl, cumulative_pnl_usd: cum, token: 'mETH', direction: pnl > 0 ? 'BUY' : 'SELL' }
  })
})()

// ── App State ──────────────────────────────────────────────────────────────
interface AppState {
  signals:      Signal[]
  whaleEvents:  WhaleEvent[]
  trades:       Trade[]
  stats:        AgentStats | null
  identity:     AgentIdentity | null
  pnlSeries:    PnLPoint[]
  rpcStatus:    RpcStatus | null
}

type LogEntry = { id: string; time: string; text: string; color: string }

const STATUS_PHRASES = [
  'Hunting liquidity anomalies on Mantle...',
  'Smart money detected near mETH pools.',
  'Scanning 240K wallets for whale patterns...',
  'Cross-referencing on-chain accumulation...',
  'AI confidence: 87% — preparing signal.',
  'Watching Merchant Moe for imbalances...',
  'New whale wallet flagged — analysing...',
]

export default function App() {
  const [state, setState] = useState<AppState>({
    signals: [],
    whaleEvents: INITIAL_WHALES,  // ← pre-seeded so screen is never blank
    trades: INITIAL_TRADES,
    stats: null,
    identity: null,
    pnlSeries: INITIAL_PNL,
    rpcStatus: null,
  })
  const [loading, setLoading] = useState({ signals: true, whales: false, trades: false, stats: true, identity: true, pnl: false })
  const [isDemoMode, setIsDemoMode]   = useState(false)
  const [demoLogs, setDemoLogs]       = useState<LogEntry[]>([])
  const [statusPhrase, setStatusPhrase] = useState(STATUS_PHRASES[0])
  const logIdxRef = useRef(0)

  // ── Rotating status phrase ──────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setStatusPhrase(STATUS_PHRASES[Math.floor(Math.random() * STATUS_PHRASES.length)])
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  // ── Fetch helpers ─────────────────────────────────────────────────────
  const fetchSignals = useCallback(async () => {
    try { const data = await api.signals(20); setState(prev => ({ ...prev, signals: data })) } catch {}
    setLoading(prev => ({ ...prev, signals: false }))
  }, [])

  const fetchWhales = useCallback(async () => {
    try { const data = await api.whaleEvents(50); if (data.length > 0) setState(prev => ({ ...prev, whaleEvents: data })) } catch {}
    setLoading(prev => ({ ...prev, whales: false }))
  }, [])

  const fetchTrades = useCallback(async () => {
    try { const data = await api.trades(50); if (data.length > 0) setState(prev => ({ ...prev, trades: data })) } catch {}
    setLoading(prev => ({ ...prev, trades: false }))
  }, [])

  const fetchStats = useCallback(async () => {
    try { const data = await api.stats(); setState(prev => ({ ...prev, stats: data })) } catch {}
    setLoading(prev => ({ ...prev, stats: false }))
  }, [])

  const fetchIdentity = useCallback(async () => {
    try { const data = await api.identity(); setState(prev => ({ ...prev, identity: data })) } catch {}
    setLoading(prev => ({ ...prev, identity: false }))
  }, [])

  const fetchPnL = useCallback(async () => {
    try { const data = await api.pnlTimeseries(); if (data.length > 0) setState(prev => ({ ...prev, pnlSeries: data })) } catch {}
    setLoading(prev => ({ ...prev, pnl: false }))
  }, [])

  const fetchHealth = useCallback(async () => {
    try { const data = await api.health(); setState(prev => ({ ...prev, rpcStatus: data.rpc })) }
    catch { setState(prev => ({ ...prev, rpcStatus: { connected: false } })) }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchSignals(); fetchWhales(); fetchTrades()
    fetchStats(); fetchIdentity(); fetchPnL(); fetchHealth()
  }, []) // eslint-disable-line

  // ── Polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sigsIv = setInterval(fetchSignals, 10_000)
    const whalIv = setInterval(fetchWhales, 15_000)
    const trdIv  = setInterval(() => { fetchTrades(); fetchPnL() }, 30_000)
    const staIv  = setInterval(() => { fetchStats(); fetchIdentity() }, 30_000)
    const hlthIv = setInterval(fetchHealth, 60_000)
    return () => { clearInterval(sigsIv); clearInterval(whalIv); clearInterval(trdIv); clearInterval(staIv); clearInterval(hlthIv) }
  }, [fetchSignals, fetchWhales, fetchTrades, fetchStats, fetchIdentity, fetchPnL, fetchHealth])

  // ── Demo / Simulation Mode ───────────────────────────────────────────
  const startDemo = useCallback(() => {
    setIsDemoMode(true)
    audio.init()
  }, [])

  useEffect(() => {
    if (!isDemoMode) return

    // Log injection — cycles through script, then random
    const logIv = setInterval(() => {
      const idx = logIdxRef.current % REASONING_SCRIPTS.length
      const entry = REASONING_SCRIPTS[idx]
      audio.playType()
      setDemoLogs(prev => [...prev, {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text: entry.text,
        color: entry.color,
      }].slice(-25))
      logIdxRef.current++
    }, 1800)

    // Fast whale + trade injection
    const dataIv = setInterval(() => {
      const isBuy  = Math.random() > 0.35
      const token  = DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)]
      const amount = 80_000 + Math.random() * 620_000
      const whale  = makeMockWhale(token)
      const trade  = makeMockTrade(isBuy, token, amount)
      audio.playPing()
      setState(prev => ({
        ...prev,
        whaleEvents: [whale, ...prev.whaleEvents].slice(0, 60),
        trades: [trade, ...prev.trades].slice(0, 60),
        pnlSeries: [...prev.pnlSeries, {
          timestamp: new Date().toISOString(),
          pnl_usd: trade.pnl_usd ?? 0,
          cumulative_pnl_usd: (prev.pnlSeries[prev.pnlSeries.length - 1]?.cumulative_pnl_usd ?? 0) + (trade.pnl_usd ?? 0),
          token,
          direction: isBuy ? 'BUY' : 'SELL',
        }].slice(-50),
      }))
    }, 2200)

    return () => { clearInterval(logIv); clearInterval(dataIv) }
  }, [isDemoMode])

  const latestSignal = state.signals[0] ?? null
  const isConnected  = state.rpcStatus?.connected ?? false
  const latestBlock  = state.rpcStatus?.latest_block
  const avatarStatus: 'idle' | 'scanning' | 'alert' = isDemoMode ? 'alert' : (loading.whales ? 'scanning' : 'idle')

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Ambient background */}
      <div className="bg-grid fixed inset-0 pointer-events-none opacity-60" />
      <div className="orb orb-green fixed pointer-events-none" />
      <div className="orb orb-cyan fixed pointer-events-none" />

      {/* Layout */}
      <div className="relative z-10 flex flex-col h-screen">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pr-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] w-full shrink-0">
          <div className="flex-1 min-w-0"><LiveTicker isConnected={isConnected} latestBlock={latestBlock} /></div>
          <div className="flex items-center gap-3 shrink-0">
            {/* AI status phrase */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-3)] animate-pulse shrink-0" />
              <span className="font-mono text-[10px] text-[var(--text-muted)] truncate max-w-[220px]">{statusPhrase}</span>
            </div>

            {!isDemoMode ? (
              <button
                id="demo-mode-btn"
                onClick={startDemo}
                className="font-mono text-[10px] font-bold px-4 py-2 rounded-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-red) 0%, var(--accent-3) 100%)',
                  boxShadow: '0 0 20px var(--red-glow)',
                  animation: 'glowPulse 2s ease-in-out infinite',
                }}
              >
                ▶ LIVE SIMULATION
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/40">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] animate-ping" />
                <span className="font-mono text-[10px] text-[var(--accent-red)] font-bold">SIMULATION LIVE</span>
              </div>
            )}

            <AIAvatar status={avatarStatus} />
          </div>
        </div>

        {/* ── Main content grid ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] divide-x divide-[var(--border-subtle)]">

          {/* ── LEFT column ──────────────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col overflow-y-auto bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="p-3 shrink-0 animate-in">
              <AgentIdentityCard identity={state.identity} stats={state.stats} loading={loading.identity} />
            </div>
            <div className="p-3 shrink-0 animate-in delay-1">
              <SignalCard signal={latestSignal} loading={loading.signals} />
            </div>
            <div className="p-3 flex-1 min-h-0 animate-in delay-2">
              <PnLChart data={state.pnlSeries} loading={false} />
            </div>
          </aside>

          {/* ── CENTER column ─────────────────────────────────────────────── */}
          <main className="flex flex-col overflow-hidden bg-[var(--bg-base)]">
            {/* Network map: top half */}
            <div className="shrink-0" style={{ height: '42%' }}>
              <NetworkMap events={state.whaleEvents} />
            </div>

            {/* Whale feed: bottom half */}
            <div className="flex-1 min-h-0 border-t border-[var(--border-subtle)] relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
              <WhaleFeed events={state.whaleEvents} loading={false} />
            </div>
          </main>

          {/* ── RIGHT column ─────────────────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col overflow-hidden bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="flex-1 min-h-0 p-0 animate-in delay-2">
              <AIReasoningEngine logs={demoLogs} />
            </div>
            <div className="shrink-0 p-3 animate-in delay-3" style={{ height: '38%' }}>
              <ProfitableTrades trades={state.trades} />
            </div>
          </aside>
        </div>

        {/* ── Mobile: stacked ────────────────────────────────────────────── */}
        <div className="lg:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <AIAvatar status={avatarStatus} />
            {!isDemoMode && (
              <button
                onClick={startDemo}
                className="font-mono text-[10px] font-bold px-4 py-2 rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, var(--accent-red) 0%, var(--accent-3) 100%)' }}
              >
                ▶ LIVE SIMULATION
              </button>
            )}
          </div>
          <AgentIdentityCard identity={state.identity} stats={state.stats} loading={loading.identity} />
          <NetworkMap events={state.whaleEvents} />
          <SignalCard signal={latestSignal} loading={loading.signals} />
          <WhaleFeed events={state.whaleEvents} loading={false} />
          <AIReasoningEngine logs={demoLogs} />
          <ProfitableTrades trades={state.trades} />
          <PnLChart data={state.pnlSeries} loading={false} />
        </div>
      </div>
    </div>
  )
}
