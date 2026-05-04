import { useEffect, useState, useCallback } from 'react'
import type { Signal, WhaleEvent, Trade, AgentStats, AgentIdentity, PnLPoint, RpcStatus } from '@/types'
import { api } from '@/lib/api'

import LiveTicker from '@/components/LiveTicker'
import WhaleFeed from '@/components/WhaleFeed'
import SignalCard from '@/components/SignalCard'
import AgentIdentityCard from '@/components/AgentIdentity'
import PnLChart from '@/components/PnLChart'
import DecisionLog from '@/components/DecisionLog'

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

// ── Initial Loading Flags ────────────────────────────────────────────────
interface LoadingState {
  signals:     boolean
  whales:      boolean
  trades:      boolean
  stats:       boolean
  identity:    boolean
  pnl:         boolean
}

export default function App() {
  const [state, setState] = useState<AppState>({
    signals: [], whaleEvents: [], trades: [],
    stats: null, identity: null, pnlSeries: [], rpcStatus: null,
  })
  const [loading, setLoading] = useState<LoadingState>({
    signals: true, whales: true, trades: true,
    stats: true, identity: true, pnl: true,
  })

  // ── Fetch helpers ─────────────────────────────────────────────────────
  const fetchSignals = useCallback(async () => {
    try {
      const data = await api.signals(20)
      setState(prev => ({ ...prev, signals: data }))
    } catch { /* backend may not be running yet */ }
    setLoading(prev => ({ ...prev, signals: false }))
  }, [])

  const fetchWhales = useCallback(async () => {
    try {
      const data = await api.whaleEvents(50)
      setState(prev => ({ ...prev, whaleEvents: data }))
    } catch {}
    setLoading(prev => ({ ...prev, whales: false }))
  }, [])

  const fetchTrades = useCallback(async () => {
    try {
      const data = await api.trades(50)
      setState(prev => ({ ...prev, trades: data }))
    } catch {}
    setLoading(prev => ({ ...prev, trades: false }))
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.stats()
      setState(prev => ({ ...prev, stats: data }))
    } catch {}
    setLoading(prev => ({ ...prev, stats: false }))
  }, [])

  const fetchIdentity = useCallback(async () => {
    try {
      const data = await api.identity()
      setState(prev => ({ ...prev, identity: data }))
    } catch {}
    setLoading(prev => ({ ...prev, identity: false }))
  }, [])

  const fetchPnL = useCallback(async () => {
    try {
      const data = await api.pnlTimeseries()
      setState(prev => ({ ...prev, pnlSeries: data }))
    } catch {}
    setLoading(prev => ({ ...prev, pnl: false }))
  }, [])

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.health()
      setState(prev => ({ ...prev, rpcStatus: data.rpc }))
    } catch {
      setState(prev => ({ ...prev, rpcStatus: { connected: false } }))
    }
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchSignals()
    fetchWhales()
    fetchTrades()
    fetchStats()
    fetchIdentity()
    fetchPnL()
    fetchHealth()
  }, [])

  // ── Polling intervals ─────────────────────────────────────────────────
  useEffect(() => {
    // Signals: every 10s
    const sigsIv = setInterval(fetchSignals, 10_000)
    // Whale events: every 15s
    const whalIv = setInterval(fetchWhales, 15_000)
    // Trades + PnL: every 30s
    const trdIv  = setInterval(() => { fetchTrades(); fetchPnL() }, 30_000)
    // Stats + identity: every 30s
    const staIv  = setInterval(() => { fetchStats(); fetchIdentity() }, 30_000)
    // Health: every 60s
    const hlthIv = setInterval(fetchHealth, 60_000)

    return () => {
      clearInterval(sigsIv)
      clearInterval(whalIv)
      clearInterval(trdIv)
      clearInterval(staIv)
      clearInterval(hlthIv)
    }
  }, [fetchSignals, fetchWhales, fetchTrades, fetchStats, fetchIdentity, fetchPnL, fetchHealth])

  const latestSignal = state.signals[0] ?? null
  const isConnected  = state.rpcStatus?.connected ?? false
  const latestBlock  = state.rpcStatus?.latest_block

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Ambient background */}
      <div className="bg-grid fixed inset-0 pointer-events-none" />
      <div className="orb orb-green fixed pointer-events-none" />
      <div className="orb orb-cyan fixed pointer-events-none" />

      {/* Layout */}
      <div className="relative z-10 flex flex-col h-screen">

        {/* ── Top ticker ────────────────────────────────────────────────── */}
        <LiveTicker isConnected={isConnected} latestBlock={latestBlock} />

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-0 divide-x divide-[var(--border-subtle)]">

          {/* ── LEFT column: Agent Identity + PnL Chart ─────────────────── */}
          <aside className="hidden lg:flex flex-col gap-0 overflow-y-auto bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="p-3 animate-in">
              <AgentIdentityCard
                identity={state.identity}
                stats={state.stats}
                loading={loading.identity}
              />
            </div>
            <div className="p-3 animate-in delay-2">
              <PnLChart data={state.pnlSeries} loading={loading.pnl} />
            </div>

            {/* Quick stats footer */}
            {state.stats && (
              <div className="p-3 animate-in delay-3">
                <div className="card-cyan card p-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'BUY',  val: state.stats.buy_signals,  cls: 'text-[var(--accent)]' },
                    { label: 'SELL', val: state.stats.sell_signals, cls: 'text-[var(--accent-red)]' },
                    { label: 'HOLD', val: state.stats.hold_signals, cls: 'text-[var(--accent-yellow)]' },
                  ].map(({ label, val, cls }) => (
                    <div key={label}>
                      <div className={`font-mono font-bold text-lg ${cls}`}>{val}</div>
                      <div className="font-mono text-[9px] text-[var(--text-muted)]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── CENTER column: Whale Feed ─────────────────────────────────── */}
          <main className="flex flex-col overflow-hidden animate-in delay-1">
            {/* Section label */}
            <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                🔍 Live On-Chain Movements · Mantle Network
              </span>
            </div>
            <WhaleFeed events={state.whaleEvents} loading={loading.whales} />
          </main>

          {/* ── RIGHT column: Signal Card + Decision Log ─────────────────── */}
          <aside className="hidden lg:flex flex-col overflow-hidden bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="p-3 animate-in delay-2">
              <SignalCard signal={latestSignal} loading={loading.signals} />
            </div>
            <div className="flex-1 overflow-hidden animate-in delay-3">
              <DecisionLog trades={state.trades} loading={loading.trades} />
            </div>
          </aside>
        </div>

        {/* ── Mobile: stacked layout for small screens ───────────────────── */}
        <div className="lg:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          <AgentIdentityCard identity={state.identity} stats={state.stats} loading={loading.identity} />
          <SignalCard signal={latestSignal} loading={loading.signals} />
          <WhaleFeed events={state.whaleEvents} loading={loading.whales} />
          <PnLChart data={state.pnlSeries} loading={loading.pnl} />
          <DecisionLog trades={state.trades} loading={loading.trades} />
        </div>
      </div>
    </div>
  )
}
