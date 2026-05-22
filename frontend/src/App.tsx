import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Signal, WhaleEvent, Trade, AgentStats, AgentIdentity, PnLPoint, RpcStatus } from '@/types'
import { api } from '@/lib/api'
import { audio } from '@/lib/audio'

import LiveTicker    from '@/components/LiveTicker'
import WhaleFeed     from '@/components/WhaleFeed'
import PnLChart      from '@/components/PnLChart'
import AICore        from '@/components/AICore'
import WhaleAlert    from '@/components/WhaleAlert'
import ThoughtStream from '@/components/ThoughtStream'
import AgentStatsPanel from '@/components/AgentStatsPanel'
import ProfitableTrades from '@/components/ProfitableTrades'

// ── Seed demo data — UI is NEVER blank ─────────────────────────────────────
const DEMO_TOKENS = ['mETH', 'WMNT', 'AGNI', 'MOE', 'USDY', 'USDC']

type LogType = 'info' | 'alert' | 'success' | 'scan'
interface LogEntry { id: string; time: string; text: string; color: string; type: LogType }

const REASONING_SCRIPTS: { text: string; type: LogType }[] = [
  { text: 'Initializing neural scan across Mantle Network...', type: 'scan' },
  { text: 'Loaded 240,000 tracked wallet signatures.', type: 'info' },
  { text: '🐋 ANOMALY DETECTED: Wallet 0x7cC...29d accumulated 3× mETH in 6 hours.', type: 'alert' },
  { text: 'Liquidity imbalance detected on Merchant Moe pool — bid side 42% thinner.', type: 'alert' },
  { text: 'Cross-referencing with 180-day smart money database...', type: 'scan' },
  { text: 'Historical match: 87% of similar setups led to +8–15% move within 4h.', type: 'info' },
  { text: 'Social sentiment rising: mETH trending on-chain analytics.', type: 'info' },
  { text: 'Whale synchronization event detected — 3 wallets coordinating entry.', type: 'alert' },
  { text: '✅ BUY signal generated: mETH | Confidence 92% | Size $15,000', type: 'success' },
  { text: 'Entry executed: $3,812.50 | SL: $3,697 | Target: $4,269', type: 'success' },
  { text: 'Monitoring position... AI tracking whale exit patterns.', type: 'scan' },
  { text: '⚠ New whale 0xF3a...11c entering AGNI — deploying capital tracker.', type: 'alert' },
  { text: '💰 TRADE CLOSED: mETH +$1,847 (+12.2%) | Reputation +8pts', type: 'success' },
  { text: 'Scanning Mantle liquidity pools for next opportunity...', type: 'scan' },
]

const STATUS_PHRASES = [
  'Tracking smart money across Mantle...',
  'Hunting liquidity anomalies in real time...',
  'Whale synchronization event detected...',
  'Scanning hidden market behavior...',
  'Monitoring 240K wallet signatures...',
  'Liquidity imbalance rising on MOE pool...',
  'Analyzing whale accumulation pattern...',
  'Smart money detected near mETH pools...',
  'AI confidence recalibrating → 91%...',
  'Autonomous trading organism online...',
]

function makeMockWhale(token?: string): WhaleEvent {
  const isBuy = Math.random() > 0.3
  const tok = token ?? DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)]
  const wallet = '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase()
  return {
    id: Math.random(),
    tx_hash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    from_wallet: wallet,
    to_wallet: '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase(),
    token: tok,
    amount_usd: 50_000 + Math.random() * 750_000,
    amount_raw: '0',
    action: (isBuy ? 'buy' : 'sell') as 'buy' | 'sell',
    block_number: 70_000_000 + Math.floor(Math.random() * 100_000),
    wallet_score: 0.6 + Math.random() * 0.4,
    timestamp: new Date().toISOString(),
  }
}

function makeMockTrade(token: string, amount: number): Trade {
  const isProfit = Math.random() > 0.25
  const pnl = amount * 0.1 * (isProfit ? 0.04 + Math.random() * 0.12 : -(0.01 + Math.random() * 0.04))
  return {
    id: Math.random(),
    signal_id: Math.random().toString(),
    tx_hash: null,
    token,
    direction: 'BUY' as 'BUY',
    size_usd: amount * 0.1,
    entry_price: 100,
    exit_price: isProfit ? 112 : 97,
    pnl_usd: pnl,
    pnl_pct: pnl / (amount * 0.1) * 100,
    mock: 1, settled: 1,
    status: 'mock' as 'mock',
    timestamp: new Date().toISOString(),
    settled_at: new Date().toISOString(),
  }
}

const INITIAL_WHALES: WhaleEvent[] = Array.from({length: 10}, (_, i) => {
  const w = makeMockWhale(DEMO_TOKENS[i % DEMO_TOKENS.length])
  w.timestamp = new Date(Date.now() - (10 - i) * 480_000).toISOString()
  return w
})
const INITIAL_TRADES: Trade[] = INITIAL_WHALES.slice(0, 6).map(w => makeMockTrade(w.token, w.amount_usd))
const INITIAL_PNL: PnLPoint[] = (() => {
  let cum = 1500
  return Array.from({length: 24}, (_, i) => {
    const pnl = (Math.random() - 0.28) * 1400
    cum += pnl
    return { timestamp: new Date(Date.now() - (24-i)*3_600_000).toISOString(), pnl_usd: pnl, cumulative_pnl_usd: cum, token: 'mETH', direction: pnl>0?'BUY':'SELL' }
  })
})()

// ── App ─────────────────────────────────────────────────────────────────────
interface AppState {
  signals: Signal[]; whaleEvents: WhaleEvent[]; trades: Trade[]
  stats: AgentStats | null; identity: AgentIdentity | null
  pnlSeries: PnLPoint[]; rpcStatus: RpcStatus | null
}

export default function App() {
  const [state, setState] = useState<AppState>({
    signals: [], whaleEvents: INITIAL_WHALES, trades: INITIAL_TRADES,
    stats: null, identity: null, pnlSeries: INITIAL_PNL, rpcStatus: null,
  })
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [alertEvent, setAlertEvent] = useState<WhaleEvent | null>(null)
  const [statusPhrase, setStatusPhrase] = useState(STATUS_PHRASES[0])
  const [whaleFlash, setWhaleFlash] = useState(false)
  const logIdxRef = useRef(0)
  const alertTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Rotating status phrase ────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setStatusPhrase(STATUS_PHRASES[Math.floor(Math.random() * STATUS_PHRASES.length)])
    }, 4500)
    return () => clearInterval(iv)
  }, [])

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchWhales = useCallback(async () => {
    try { const d = await api.whaleEvents(50); if (d.length > 0) setState(prev => ({...prev, whaleEvents: d})) } catch {}
  }, [])
  const fetchTrades = useCallback(async () => {
    try { const d = await api.trades(50); if (d.length > 0) setState(prev => ({...prev, trades: d})) } catch {}
  }, [])
  const fetchStats = useCallback(async () => {
    try { const d = await api.stats(); setState(prev => ({...prev, stats: d})) } catch {}
  }, [])
  const fetchIdentity = useCallback(async () => {
    try { const d = await api.identity(); setState(prev => ({...prev, identity: d})) } catch {}
  }, [])
  const fetchPnL = useCallback(async () => {
    try { const d = await api.pnlTimeseries(); if (d.length > 0) setState(prev => ({...prev, pnlSeries: d})) } catch {}
  }, [])
  const fetchHealth = useCallback(async () => {
    try { const d = await api.health(); setState(prev => ({...prev, rpcStatus: d.rpc})) }
    catch { setState(prev => ({...prev, rpcStatus: {connected: false}})) }
  }, [])

  useEffect(() => {
    fetchWhales(); fetchTrades(); fetchStats(); fetchIdentity(); fetchPnL(); fetchHealth()
  }, []) // eslint-disable-line

  useEffect(() => {
    const a = setInterval(fetchWhales, 15_000)
    const b = setInterval(() => { fetchTrades(); fetchPnL() }, 30_000)
    const c = setInterval(() => { fetchStats(); fetchIdentity() }, 30_000)
    const d = setInterval(fetchHealth, 60_000)
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); clearInterval(d) }
  }, [fetchWhales, fetchTrades, fetchPnL, fetchStats, fetchIdentity, fetchHealth])

  // ── Trigger whale alert + flash ───────────────────────────────────────────
  const triggerAlert = useCallback((event: WhaleEvent) => {
    setAlertEvent(event)
    setWhaleFlash(true)
    audio.playPing()
    clearTimeout(alertTimer.current)
    alertTimer.current = setTimeout(() => {
      setAlertEvent(null)
      setWhaleFlash(false)
    }, 6000)
  }, [])

  // ── Demo / Simulation ─────────────────────────────────────────────────────
  const startDemo = useCallback(() => {
    setIsDemoMode(true)
    audio.init()
  }, [])

  useEffect(() => {
    if (!isDemoMode) return

    const logIv = setInterval(() => {
      const idx = logIdxRef.current % REASONING_SCRIPTS.length
      const script = REASONING_SCRIPTS[idx]
      audio.playType()
      const entry: LogEntry = {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text: script.text,
        color: script.type === 'alert' ? 'var(--red)' : script.type === 'success' ? 'var(--green)' : script.type === 'scan' ? 'var(--purple)' : 'var(--cyan)',
        type: script.type,
      }
      setLogs(prev => [...prev, entry].slice(-30))
      logIdxRef.current++
    }, 1700)

    const dataIv = setInterval(() => {
      const token = DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)]
      const amount = 60_000 + Math.random() * 700_000
      const whale = makeMockWhale(token)
      const trade = makeMockTrade(token, amount)

      setState(prev => ({
        ...prev,
        whaleEvents: [whale, ...prev.whaleEvents].slice(0, 60),
        trades: [trade, ...prev.trades].slice(0, 60),
        pnlSeries: [...prev.pnlSeries, {
          timestamp: new Date().toISOString(),
          pnl_usd: trade.pnl_usd ?? 0,
          cumulative_pnl_usd: (prev.pnlSeries[prev.pnlSeries.length-1]?.cumulative_pnl_usd ?? 0) + (trade.pnl_usd ?? 0),
          token, direction: 'BUY',
        }].slice(-60),
      }))

      // Trigger big whale alert for large events
      if (whale.amount_usd > 200_000) triggerAlert(whale)
    }, 2000)

    return () => { clearInterval(logIv); clearInterval(dataIv) }
  }, [isDemoMode, triggerAlert])

  const isConnected = state.rpcStatus?.connected ?? false
  const latestBlock = state.rpcStatus?.latest_block

  return (
    <div className="relative h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── Ambient layers ─────────────────────────────────────────────── */}
      <div className="bg-particles" />
      <div className="bg-grid" style={{ opacity: 0.6 }} />

      {/* ── Whale flash effect ──────────────────────────────────────────── */}
      <AnimatePresence>
        {whaleFlash && (
          <motion.div
            key="flash"
            className="fixed inset-0 pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.12, 0] }}
            transition={{ duration: 1.2, times: [0, 0.2, 1] }}
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,59,92,0.5) 0%, transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Layout ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-screen">

        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center w-full" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <LiveTicker isConnected={isConnected} latestBlock={latestBlock} />
          </div>

          {/* Right header controls */}
          <div
            className="flex items-center gap-4 px-4 shrink-0 h-10"
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            {/* AI latency */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px]" style={{ color: 'var(--text-muted)' }}>LATENCY</span>
              <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--green)' }}>
                {(Math.random() * 12 + 4).toFixed(0)}ms
              </span>
            </div>
            {/* Confidence */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px]" style={{ color: 'var(--text-muted)' }}>CONF</span>
              <span className="font-mono text-[9px] font-bold" style={{ color: 'var(--cyan)' }}>92%</span>
            </div>

            {/* Demo button */}
            {!isDemoMode ? (
              <motion.button
                id="demo-mode-btn"
                onClick={startDemo}
                className="font-orbitron text-[9px] font-bold px-4 py-1.5 rounded-lg text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--red) 0%, var(--purple) 100%)',
                  boxShadow: '0 0 20px rgba(255,59,92,0.4)',
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(255,59,92,0.7)' }}
                whileTap={{ scale: 0.96 }}
                animate={{ boxShadow: ['0 0 20px rgba(255,59,92,0.4)', '0 0 40px rgba(255,59,92,0.7)', '0 0 20px rgba(255,59,92,0.4)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ▶ LIVE SIMULATION
              </motion.button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg"
                style={{ background: 'rgba(255,59,92,0.12)', border: '1px solid rgba(255,59,92,0.35)' }}>
                <motion.span className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }}
                  animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="font-orbitron text-[8px] font-bold" style={{ color: 'var(--red)' }}>
                  SIMULATION ACTIVE
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Main 3-column grid ──────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-hidden grid"
          style={{
            gridTemplateColumns: '260px 1fr 280px',
            borderTop: 'none',
          }}
        >
          {/* ── LEFT: Agent stats ──────────────────────────────────────── */}
          <aside
            className="overflow-hidden flex flex-col"
            style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface)' }}
          >
            <AgentStatsPanel
              identity={state.identity}
              stats={state.stats}
              loading={false}
              statusPhrase={statusPhrase}
            />
          </aside>

          {/* ── CENTER: AI Core + Whale Feed ───────────────────────────── */}
          <main className="flex flex-col overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            {/* Whale popup alert */}
            <WhaleAlert event={alertEvent} onDismiss={() => setAlertEvent(null)} />

            {/* AI Core Orb — top 44% */}
            <div className="shrink-0 p-4 relative" style={{ height: '44%' }}>
              <AICore active={isDemoMode} whaleCount={state.whaleEvents.length} />
            </div>

            {/* Divider */}
            <div className="shrink-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, var(--cyan), var(--purple), transparent)', opacity: 0.4 }} />

            {/* Whale Feed — bottom 56% */}
            <div className="flex-1 min-h-0">
              <WhaleFeed events={state.whaleEvents} loading={false} />
            </div>
          </main>

          {/* ── RIGHT: Thought stream + Trades ────────────────────────── */}
          <aside
            className="flex flex-col overflow-hidden"
            style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)' }}
          >
            {/* AI Thought Stream — top 55% */}
            <div className="flex-1 min-h-0 overflow-hidden"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <ThoughtStream logs={logs} />
            </div>

            {/* PnL chart + trades — bottom 45% */}
            <div className="shrink-0 flex flex-col overflow-hidden" style={{ height: '45%' }}>
              <div className="px-4 py-2 shrink-0"
                style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)' }}>
                <span className="font-orbitron text-[8px] font-bold tracking-widest"
                  style={{ color: 'var(--green)' }}>
                  ▲ PROFITABLE TRADES
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ProfitableTrades trades={state.trades} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
