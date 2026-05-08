import { useEffect, useState, useCallback } from 'react'
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

  // ── Hackathon Demo State ──────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [demoLogs, setDemoLogs] = useState<{id:string,time:string,text:string,color:string}[]>([])

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

  // ── Demo Simulation Logic ─────────────────────────────────────────────
  useEffect(() => {
    if (!isDemoMode) return
    audio.init()
    
    // Inject mock logs
    const logStrings = [
      "Wallet 0x7cC... accumulated 240K mETH in 3 hours.",
      "Liquidity thin on Merchant Moe pool.",
      "High correlation with previous whale pumps.",
      "AI predicts breakout probability: 87%",
      "Executing sub-second entry to minimize slippage.",
      "Targeting +12% exit."
    ]
    
    let i = 0
    const logIv = setInterval(() => {
      audio.playType()
      const log = logStrings[i % logStrings.length]
      setDemoLogs(prev => [...prev, {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text: log,
        color: log.includes('buy') || log.includes('accumulate') ? 'var(--accent)' : 'var(--accent-2)'
      }].slice(-20))
      i++
    }, 2000)

    // Inject mock whales and trades
    const dataIv = setInterval(() => {
      setState(prev => {
        const isBuy = Math.random() > 0.5
        const token = Math.random() > 0.5 ? 'mETH' : 'USDT'
        const amount = 150000 + Math.random() * 500000
        
        return {
          ...prev,
          whaleEvents: [...prev.whaleEvents, {
            id: Math.random(),
            tx_hash: '0x' + Math.random().toString(16).slice(2),
            from_wallet: '0x' + Math.random().toString(16).slice(2, 10),
            to_wallet: '0x...',
            token,
            amount_usd: amount,
            amount_raw: '0',
            action: (isBuy ? 'buy' : 'sell') as 'buy' | 'sell',
            block_number: 999999,
            wallet_score: 0.8 + Math.random() * 0.2,
            timestamp: new Date().toISOString()
          }].slice(-50),
          trades: [...prev.trades, {
            id: Math.random(),
            signal_id: Math.random().toString(),
            tx_hash: null,
            token,
            direction: (isBuy ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
            size_usd: amount * 0.1, // 10% trade size
            entry_price: 100,
            exit_price: 112,
            pnl_usd: (amount * 0.1) * (0.05 + Math.random() * 0.1), // 5-15% profit
            pnl_pct: 0.1,
            mock: 1,
            settled: 1,
            status: 'mock' as 'mock',
            timestamp: new Date().toISOString(),
            settled_at: new Date().toISOString()
          }].slice(-50)
        }
      })
    }, 1500)

    return () => { clearInterval(logIv); clearInterval(dataIv) }
  }, [isDemoMode])

  const latestSignal = state.signals[0] ?? null
  const isConnected  = state.rpcStatus?.connected ?? false
  const latestBlock  = state.rpcStatus?.latest_block
  const avatarStatus = isDemoMode ? 'alert' : loading.whales ? 'scanning' : 'idle'

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Ambient background */}
      <div className="bg-grid fixed inset-0 pointer-events-none" />
      <div className="orb orb-green fixed pointer-events-none" />
      <div className="orb orb-cyan fixed pointer-events-none" />

      {/* Layout */}
      <div className="relative z-10 flex flex-col h-screen">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pr-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] w-full">
          <div className="flex-1 min-w-0"><LiveTicker isConnected={isConnected} latestBlock={latestBlock} /></div>
          <div className="flex items-center gap-6 shrink-0 z-50">
            {!isDemoMode && (
              <button 
                onClick={() => setIsDemoMode(true)}
                className="font-mono text-[10px] font-bold px-3 py-1.5 rounded bg-[var(--accent-red)] text-white hover:shadow-[0_0_15px_var(--red-glow)] transition-all animate-pulse"
              >
                ▶ RUN LIVE SIMULATION
              </button>
            )}
            <AIAvatar status={avatarStatus} />
          </div>
        </div>

        {/* ── Main content grid ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-0 divide-x divide-[var(--border-subtle)]">

          {/* ── LEFT column: Identity, Signal, PnL ──────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-0 overflow-y-auto bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="p-3 animate-in"><AgentIdentityCard identity={state.identity} stats={state.stats} loading={loading.identity} /></div>
            <div className="p-3 animate-in delay-1"><SignalCard signal={latestSignal} loading={loading.signals} /></div>
            <div className="p-3 animate-in delay-2 flex-1"><PnLChart data={state.pnlSeries} loading={loading.pnl} /></div>
          </aside>

          {/* ── CENTER column: Map & Feed ───────────────────────────────── */}
          <main className="flex flex-col overflow-hidden animate-in delay-1 bg-[var(--bg-base)]">
            <div className="h-1/2 p-4 border-b border-[var(--border-subtle)]">
              <NetworkMap events={state.whaleEvents} />
            </div>
            <div className="h-1/2 flex flex-col relative">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-20" />
              <WhaleFeed events={state.whaleEvents} loading={loading.whales} />
            </div>
          </main>

          {/* ── RIGHT column: AI Brain & Trades ─────────────────────────── */}
          <aside className="hidden lg:flex flex-col overflow-hidden bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
            <div className="flex-1 p-3 animate-in delay-2">
              <AIReasoningEngine logs={demoLogs} />
            </div>
            <div className="h-1/3 p-3 animate-in delay-3">
              <ProfitableTrades trades={state.trades} />
            </div>
          </aside>
        </div>

        {/* ── Mobile: stacked layout ────────────────────────────────────── */}
        <div className="lg:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1">
          <AIAvatar status={avatarStatus} />
          <AgentIdentityCard identity={state.identity} stats={state.stats} loading={loading.identity} />
          <NetworkMap events={state.whaleEvents} />
          <SignalCard signal={latestSignal} loading={loading.signals} />
          <WhaleFeed events={state.whaleEvents} loading={loading.whales} />
          <AIReasoningEngine logs={demoLogs} />
          <ProfitableTrades trades={state.trades} />
          <PnLChart data={state.pnlSeries} loading={loading.pnl} />
        </div>
      </div>
    </div>
  )
}
