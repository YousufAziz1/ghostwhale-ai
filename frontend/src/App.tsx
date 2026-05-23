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
import TxPopup from '@/components/TxPopup'

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

const MOCK_STATS: AgentStats = {
  total_signals: 142,
  acted_on: 87,
  avg_confidence: 88.5,
  buy_signals: 90,
  sell_signals: 42,
  hold_signals: 10,
  settled_trades: 87,
  winning_trades: 60,
  win_rate_pct: 68.9,
  total_pnl_usd: 12450.45,
  best_trade_usd: 2150.00,
  worst_trade_usd: -450.00,
  reputation_score: 840
}

const MOCK_IDENTITY: AgentIdentity = {
  name: "GHOSTWHALE",
  version: "AI-001",
  description: "Autonomous trading organism",
  image_url: "",
  created_at: new Date().toISOString(),
  network: "Mantle Mainnet",
  chain_id: 5000,
  mode: 'MOCK',
  standard: "ERC-8004",
  token_id: 1,
  nft_address: "0xGHOST...WHALE",
  explorer_url: null,
  reputation_score: 840,
  win_rate_pct: 68.9,
  total_signals: 142,
  total_pnl_usd: 12450.45,
  best_trade_usd: 2150.00,
  settled_trades: 87,
  winning_trades: 60,
  fetched_at: new Date().toISOString()
}

// ── App ─────────────────────────────────────────────────────────────────────
interface AppState {
  signals: Signal[]; whaleEvents: WhaleEvent[]; trades: Trade[]
  stats: AgentStats | null; identity: AgentIdentity | null
  pnlSeries: PnLPoint[]; rpcStatus: RpcStatus | null
}

export default function App() {
  const [state, setState] = useState<AppState>({
    signals: [], whaleEvents: INITIAL_WHALES, trades: INITIAL_TRADES,
    stats: MOCK_STATS, identity: MOCK_IDENTITY, pnlSeries: INITIAL_PNL, rpcStatus: null,
  })
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [logs, setLogs]             = useState<LogEntry[]>([{
    id: 'init1', time: new Date().toLocaleTimeString(), text: 'System boot sequence initiated...', color: 'var(--cyan)', type: 'info'
  }, {
    id: 'init2', time: new Date().toLocaleTimeString(), text: 'Initializing neural scan across Mantle Network...', color: 'var(--purple)', type: 'scan'
  }])
  const [alertEvent, setAlertEvent] = useState<WhaleEvent | null>(null)
  const [statusPhrase, setStatusPhrase] = useState(STATUS_PHRASES[0])
  const [whaleFlash, setWhaleFlash] = useState(false)
  const [txPopupEvent, setTxPopupEvent] = useState<Trade | null>(null)
  const logIdxRef = useRef(0)
  const alertTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const txTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    try { 
      const d = await api.stats(); 
      if (d && d.total_signals > 0) setState(prev => ({...prev, stats: d})) 
    } catch {}
  }, [])
  const fetchIdentity = useCallback(async () => {
    try { 
      const d = await api.identity(); 
      if (d && d.reputation_score > 0) setState(prev => ({...prev, identity: d})) 
    } catch {}
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
    if (event.amount_usd > 400000) {
      audio.playAlarm()
      audio.speak(`Massive ${event.action === 'buy' ? 'accumulation' : 'dump'} detected on ${event.token}.`)
    } else {
      audio.playPing()
    }
    clearTimeout(alertTimer.current)
    alertTimer.current = setTimeout(() => {
      setAlertEvent(null)
      setWhaleFlash(false)
    }, 6000)
  }, [])

  // ── Demo / Simulation & AI Thoughts ───────────────────────────────────────
  const startDemo = useCallback(() => {
    setIsDemoMode(true)
    audio.init()
    
    // Dramatic AI Voice Wake Up
    audio.speak("Ghost mode activated. Autonomous AI hunting protocol engaged. Scanning Mantle network for whale accumulation.")
    
    // Cinematic wake-up: trigger massive alerts immediately
    const wakeUpTokens = [...DEMO_TOKENS].sort(() => 0.5 - Math.random()).slice(0, 3)
    wakeUpTokens.forEach((token, i) => {
      setTimeout(() => {
        const whale = makeMockWhale(token)
        whale.amount_usd = 2_000_000 + Math.random() * 5_000_000 // Huge amounts for demo
        triggerAlert(whale)
        setState(prev => ({ ...prev, whaleEvents: [whale, ...prev.whaleEvents].slice(0, 60) }))
      }, 500 + i * 2500)
    })
  }, [triggerAlert])

  // Stream AI thoughts continuously (faster when demo is active)
  useEffect(() => {
    const logIv = setInterval(() => {
      const idx = logIdxRef.current % REASONING_SCRIPTS.length
      const script = REASONING_SCRIPTS[idx]
      if (isDemoMode) audio.playType()
      const entry: LogEntry = {
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString(),
        text: script.text,
        color: script.type === 'alert' ? 'var(--red)' : script.type === 'success' ? 'var(--green)' : script.type === 'scan' ? 'var(--purple)' : 'var(--cyan)',
        type: script.type,
      }
      setLogs(prev => [...prev, entry].slice(-30))
      logIdxRef.current++
    }, isDemoMode ? 1700 : 3800)
    return () => clearInterval(logIv)
  }, [isDemoMode])

  // Data flooding in demo mode
  useEffect(() => {
    if (!isDemoMode) return
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
      if (trade.pnl_usd && trade.pnl_usd > 2000) audio.playSuccess()
      
      // Randomly pop up the transaction confirmation
      if (Math.random() > 0.8) {
        setTxPopupEvent(trade)
        clearTimeout(txTimer.current)
        txTimer.current = setTimeout(() => setTxPopupEvent(null), 4000)
      }
    }, 2000)
    return () => clearInterval(dataIv)
  }, [isDemoMode, triggerAlert])

  const isConnected = state.rpcStatus?.connected ?? false
  const latestBlock = state.rpcStatus?.latest_block

  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden" style={{ background: 'var(--bg-base)' }}>
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
      <div className="relative z-10 flex flex-col min-h-screen lg:h-screen lg:overflow-hidden">

        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center w-full" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0 flex items-center">
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
                onClick={() => {
                  audio.init()
                  audio.playAlarm()
                  startDemo()
                }}
                className="font-orbitron text-[10px] font-bold px-5 py-2 rounded-full shrink-0 btn-glow flex items-center gap-2"
                style={{
                  background: 'rgba(255,59,92,0.15)',
                  color: '#FF3B5C',
                  border: '1px solid rgba(255,59,92,0.4)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ boxShadow: ['0 0 10px rgba(255,59,92,0.2)', '0 0 20px rgba(255,59,92,0.5)', '0 0 10px rgba(255,59,92,0.2)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ marginTop: '1px' }}>
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>ACTIVATE GHOST MODE</span>
              </motion.button>
            ) : (
              <motion.button
                onClick={() => {
                  setIsDemoMode(false)
                  audio.init()
                  audio.playPing()
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ background: 'rgba(255,59,92,0.12)', border: '1px solid rgba(255,59,92,0.35)' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }}
                  animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                <span className="font-orbitron text-[8px] font-bold" style={{ color: 'var(--red)' }}>
                  SIMULATION ACTIVE
                </span>
              </motion.button>
            )}
          </div>
        </div>

        {/* ── Main 3-column grid ──────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-4 p-4 overflow-y-auto lg:overflow-hidden">
          {/* ── LEFT: Agent stats ──────────────────────────────────────── */}
          <aside className="flex flex-col rounded-xl border border-[rgba(0,245,255,0.15)] bg-[var(--bg-surface)] shadow-[0_0_30px_rgba(0,0,0,0.5)] h-[600px] lg:h-full overflow-hidden">
            <AgentStatsPanel
              identity={state.identity}
              stats={state.stats}
              loading={false}
              statusPhrase={statusPhrase}
            />
          </aside>

          {/* ── CENTER: AI Core + Whale Feed ───────────────────────────── */}
          <main className="flex flex-col relative rounded-xl border border-[rgba(0,245,255,0.15)] bg-[var(--bg-base)] shadow-[0_0_30px_rgba(0,0,0,0.5)] min-h-[600px] lg:h-full overflow-hidden">
            {/* Whale popup alert */}
            <WhaleAlert event={alertEvent} onDismiss={() => setAlertEvent(null)} />
            
            {/* Real TX confirmation popup */}
            <TxPopup trade={txPopupEvent} />

            {/* AI Core Orb — top 44% */}
            <div className="shrink-0 p-4 relative" style={{ height: '44%' }}>
              <AICore active={isDemoMode} whaleCount={state.whaleEvents.length} events={state.whaleEvents} />
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
          <aside className="flex flex-col rounded-xl border border-[rgba(0,245,255,0.15)] bg-[var(--bg-surface)] shadow-[0_0_30px_rgba(0,0,0,0.5)] h-[600px] lg:h-full overflow-hidden">
            {/* AI Thought Stream — top 55% */}
            <div className="flex-1 min-h-0 overflow-hidden"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <ThoughtStream logs={logs} />
            </div>

            {/* PnL chart + trades — bottom 45% */}
            <div className="shrink-0 flex flex-col overflow-hidden" style={{ height: '45%' }}>
              <div className="flex-1 min-h-0 overflow-hidden relative" style={{ borderBottom: '1px solid var(--border)' }}>
                <PnLChart data={state.pnlSeries} loading={false} />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
