import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Signal, WhaleEvent, Trade, AgentStats, AgentIdentity, PnLPoint, RpcStatus } from '@/types'
import { api, formatUSD, truncateAddr } from '@/lib/api'
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
import NeuralReasoningLogs from '@/components/NeuralReasoningLogs'
import TradeExecutionFeed from '@/components/TradeExecutionFeed'
import LiquidityScanner from '@/components/LiquidityScanner'
import TxIntelligenceModal from '@/components/TxIntelligenceModal'
import CouncilDebate from '@/components/CouncilDebate'

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
  const txHash = '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')
  const score = 0.6 + Math.random() * 0.4
  const confidence = Math.round(score * 100)
  
  // Custom reasoning mock script matching token
  let customReasoning = `Heavy block transfer of ${tok} detected. Neural logic suggests accumulation near local supports.`
  if (tok === 'mETH' || tok === 'ETH') {
    customReasoning = `Smart money vault executing aggressive mETH accumulation block. Historical patterns suggest 85% probability of bullish momentum.`
  } else if (tok === 'AGNI' || tok === 'MOE') {
    customReasoning = `Merchant Moe liquidity routing event. Big swap volumes coordinates with known smart wallets indicating imminent pool expansion.`
  }

  return {
    id: Math.random(),
    tx_hash: txHash,
    from_wallet: wallet,
    to_wallet: '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('').toUpperCase(),
    token: tok,
    amount_usd: 50_000 + Math.random() * 750_000,
    amount_raw: '0',
    action: (isBuy ? 'buy' : 'sell') as 'buy' | 'sell',
    block_number: 72_384_000 + Math.floor(Math.random() * 10_000),
    wallet_score: score,
    timestamp: new Date().toISOString(),
    // Telemetry fields
    gas_fee: (0.0021 + Math.random() * 0.0064).toFixed(4) + ' MNT',
    chain_source: 'Mantle Sepolia',
    smart_money_tier: confidence >= 85 ? 'Tier 1' : confidence >= 70 ? 'Tier 2' : 'Tier 3',
    ai_reasoning: customReasoning,
    explorer_link: `https://mantlescan.xyz/tx/${txHash}`,
    tx_type: isBuy ? 'DEX Swap Router' : 'Liquidity Outflow',
    wallet_label: Math.random() > 0.5 ? 'Institutional Smart Vault' : 'DeFi Arbitrage Fund',
    sparkline_data: Array.from({length: 9}, () => Math.floor(10 + Math.random() * 80))
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
  const [selectedWhaleEvent, setSelectedWhaleEvent] = useState<WhaleEvent | null>(null)
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
  const fetchSignals = useCallback(async () => {
    try { const d = await api.signals(20); if (d.length > 0) setState(prev => ({...prev, signals: d})) } catch {}
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
    fetchWhales(); fetchSignals(); fetchTrades(); fetchStats(); fetchIdentity(); fetchPnL(); fetchHealth()
  }, []) // eslint-disable-line

  useEffect(() => {
    const a = setInterval(fetchWhales, 15_000)
    const b = setInterval(fetchSignals, 15_000)
    const c = setInterval(() => { fetchTrades(); fetchPnL() }, 30_000)
    const d = setInterval(() => { fetchStats(); fetchIdentity() }, 30_000)
    const e = setInterval(fetchHealth, 60_000)
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); clearInterval(d); clearInterval(e) }
  }, [fetchWhales, fetchSignals, fetchTrades, fetchPnL, fetchStats, fetchIdentity, fetchHealth])

  // ── Server-Sent Events (SSE) Listener for Real-Time HUD updates ───────────
  useEffect(() => {
    // Establish EventSource connection for streaming events
    const sseUrl = `${api.defaults?.baseURL || 'http://localhost:8000'}/api/events`
    console.log("Connecting to SSE stream at", sseUrl)
    const source = new EventSource(sseUrl)
    
    source.addEventListener('whale_event', (e) => {
      try {
        const data = JSON.parse(e.data) as WhaleEvent
        setState(prev => ({
          ...prev,
          whaleEvents: [data, ...prev.whaleEvents].slice(0, 60)
        }))
        triggerAlert(data)
      } catch (err) {
        console.error("Failed to parse SSE whale event:", err)
      }
    })
    
    source.addEventListener('signal', (e) => {
      try {
        const data = JSON.parse(e.data) as Signal
        setState(prev => ({
          ...prev,
          signals: [data, ...prev.signals].slice(0, 20)
        }))
        // Play success sound for actionable consensus
        if (data.direction !== 'HOLD') {
          audio.playSuccess()
        }
      } catch (err) {
        console.error("Failed to parse SSE signal event:", err)
      }
    })

    source.addEventListener('trade', (e) => {
      try {
        const data = JSON.parse(e.data) as Trade
        setState(prev => ({
          ...prev,
          trades: [data, ...prev.trades].slice(0, 60)
        }))
      } catch (err) {
        console.error("Failed to parse SSE trade event:", err)
      }
    })

    source.addEventListener('settled', (e) => {
      try {
        const data = JSON.parse(e.data) as Trade
        setState(prev => {
          const updatedTrades = prev.trades.map(t => t.signal_id === data.signal_id ? { ...t, ...data } : t)
          const updatedPnL = [...prev.pnlSeries, {
            timestamp: data.settled_at || new Date().toISOString(),
            pnl_usd: data.pnl_usd ?? 0,
            cumulative_pnl_usd: (prev.pnlSeries[prev.pnlSeries.length-1]?.cumulative_pnl_usd ?? 0) + (data.pnl_usd ?? 0),
            token: data.token,
            direction: data.direction
          }].slice(-60)
          return {
            ...prev,
            trades: updatedTrades,
            pnlSeries: updatedPnL
          }
        })
        fetchStats() // refresh stats totals
      } catch (err) {
        console.error("Failed to parse SSE settled event:", err)
      }
    })
    
    source.onerror = () => {
      console.warn("SSE connection error. Retrying...")
    }
    
    return () => {
      source.close()
    }
  }, [fetchStats])

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
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden flex flex-col items-center w-full" style={{ background: 'var(--bg-base)' }}>
      {/* ── Ambient layers ─────────────────────────────────────────────── */}
      <div className="bg-particles" />
      <div className="bg-grid" style={{ opacity: 0.6 }} />
      <div className="crt-noise-overlay" />

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

      {/* ── Top Header (Full Width) ────────────────────────────────────── */}
      <header className="relative z-20 shrink-0 w-full border-b border-[var(--border)] bg-[rgba(8,11,26,0.85)] backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1880px] mx-auto w-full px-3 flex items-center justify-between h-[58px] gap-2.5">
          {/* Left / Center section */}
          <div className="flex-1 min-w-0 flex items-center h-full">
            <LiveTicker isConnected={isConnected} latestBlock={latestBlock} />
          </div>

          {/* Right header controls */}
          <div className="flex items-center justify-end gap-2.5 shrink-0 h-full">
            {/* Combined Telemetry Slot Card */}
            <div 
              style={{
                borderColor: !isDemoMode ? 'rgba(0,245,255,0.25)' : 'rgba(245,158,11,0.25)',
                boxShadow: !isDemoMode ? 'inset 0 1px 1px rgba(255,255,255,0.03), 0 0 15px rgba(0,245,255,0.08)' : 'inset 0 1px 1px rgba(255,255,255,0.03), 0 0 15px rgba(245,158,11,0.08)'
              }}
              className="hidden sm:flex flex-col justify-center px-2 py-1 border bg-[rgba(8,11,26,0.55)] rounded-lg min-w-[130px] h-[40px] select-none"
            >
              <div className="flex items-center gap-1 font-body text-[8px] font-bold text-[#A0AEC0] tracking-wider leading-none uppercase">
                {!isDemoMode ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse shadow-[0_0_6px_var(--green)]" />
                    <span>MANTLE MAINNET</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_#f59e0b]" />
                    <span>DEMO SANDBOX</span>
                  </>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 leading-none">
                <span 
                  style={{ color: !isDemoMode ? 'var(--cyan)' : '#f59e0b', textShadow: !isDemoMode ? '0 0 5px var(--cyan)' : '0 0 5px #f59e0b' }}
                  className="font-body text-[12px] font-black tracking-wide leading-none"
                >
                  {!isDemoMode ? 'LIVE FEED' : 'SIMULATED'}
                </span>
                <span className="font-body text-[7.5px] font-bold text-[#A0AEC0] tracking-wider leading-none uppercase">
                  {!isDemoMode ? 'ON-CHAIN' : 'TELEMETRY'}
                </span>
              </div>
            </div>

            {/* Cyberpunk Ghost Mode Button with rounded corners */}
            <div
              style={{
                background: !isDemoMode 
                  ? 'linear-gradient(135deg, #00F5FF 0%, #3B82F6 100%)'
                  : 'linear-gradient(135deg, #7C3AED 0%, #FF3B5C 100%)',
                padding: '1.5px'
              }}
              className="relative shrink-0 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,245,255,0.2)] h-[40px] rounded-lg overflow-hidden"
            >
              <motion.button
                onClick={() => {
                  if (!isDemoMode) {
                    audio.init()
                    audio.playAlarm()
                    startDemo()
                  } else {
                    setIsDemoMode(false)
                    audio.init()
                    audio.playPing()
                  }
                }}
                style={{
                  background: !isDemoMode ? 'rgba(8,11,26,0.95)' : '#FF3B5C',
                  color: !isDemoMode ? 'var(--cyan)' : '#FFFFFF',
                  cursor: 'pointer'
                }}
                className="font-body px-3.5 h-full w-full flex items-center justify-center gap-1.5 select-none text-xs font-black tracking-wider leading-none rounded-[6.5px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDemoMode && (
                  <motion.span 
                    className="w-1.5 h-1.5 rounded-full bg-white shrink-0"
                    animate={{ scale: [1, 1.4, 1] }} 
                    transition={{ duration: 0.8, repeat: Infinity }} 
                  />
                )}
                <div className="flex flex-col items-center justify-center leading-none text-center">
                  <span className="text-[9.5px] font-black tracking-wider uppercase">
                    {!isDemoMode ? 'RUN MOCK' : 'STOP DEMO'}
                  </span>
                  <span className="text-[10px] font-black tracking-wider uppercase mt-0.5">
                    {!isDemoMode ? 'SIMULATOR' : 'RESTORE LIVE'}
                  </span>
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout Wrapper (Subtle margins matching original spacing) ── */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col w-full lg:overflow-hidden max-w-[1880px] mx-auto px-4 py-4 lg:px-6 lg:py-5">
        {/* ── Main 3-column grid ──────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[272px_1fr_290px] gap-5 p-5 overflow-y-auto lg:overflow-hidden">
          {/* ── LEFT: Agent Stats & Council Debate ─────────────────────── */}
          <aside className="flex flex-col gap-5 h-[600px] lg:h-full overflow-y-auto feed-scroll shrink-0 pr-1 select-none" style={{ width: 280 }}>
            {/* 1. System Vital Statistics */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '310px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <AgentStatsPanel
                identity={state.identity}
                stats={state.stats}
                loading={false}
                statusPhrase={statusPhrase}
              />
            </div>

            {/* 2. Council Debate (5 cores online) */}
            <div className="flex-1 min-h-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <CouncilDebate 
                activeSignalId={state.signals[0]?.signal_id ?? null} 
                activeVotes={state.signals[0]?.votes}
              />
            </div>
          </aside>

          {/* ── CENTER: Radar Scan + Whale Feed (Separate floating panels) ── */}
          <main className="flex-1 min-h-0 flex flex-col gap-5 h-[600px] lg:h-full overflow-hidden">
            {/* Panel 1: Center Panel (Radar) — full height, perfectly circular */}
            <div className="shrink-0 hud-panel flex flex-col relative rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '48%' }}>
              <span className={`hud-corner hud-corner-tl ${alertEvent ? 'hud-corner-alert' : ''}`} />
              <span className={`hud-corner hud-corner-tr ${alertEvent ? 'hud-corner-alert' : ''}`} />
              <span className={`hud-corner hud-corner-bl ${alertEvent ? 'hud-corner-alert' : ''}`} />
              <span className={`hud-corner hud-corner-br ${alertEvent ? 'hud-corner-alert' : ''}`} />

              {/* Radar — fills full panel, centered */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative">
                <AICore active={isDemoMode} whaleCount={state.whaleEvents.length} events={state.whaleEvents} />
              </div>
            </div>

            {/* Panel 2: Live Whale Feed */}
            <div className="flex-1 min-h-0 hud-panel relative rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden">
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />

              {/* Whale popup alert */}
              <WhaleAlert event={alertEvent} onDismiss={() => setAlertEvent(null)} />
              {/* Real TX confirmation popup */}
              <TxPopup trade={txPopupEvent} />

              <WhaleFeed events={state.whaleEvents} loading={false} onSelectEvent={(event) => setSelectedWhaleEvent(event)} />
            </div>
          </main>

          {/* ── RIGHT: Thought stream + Trades (Separate floating panels) ── */}
          <aside className="flex flex-col gap-5 h-[600px] lg:h-full overflow-y-auto feed-scroll shrink-0 pr-1 select-none" style={{ width: 290 }}>
            {/* 1. AI Thought Stream */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '250px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <ThoughtStream logs={logs} />
            </div>

            {/* 2. Neural Reasoning Logs */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '135px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <NeuralReasoningLogs />
            </div>

            {/* 3. Trade Execution Feed */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '150px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <TradeExecutionFeed />
            </div>

            {/* 4. Liquidity Scanner */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '170px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <LiquidityScanner />
            </div>

            {/* 5. AI Signal Generation */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden flex flex-col justify-center px-5 py-4" style={{ height: '80px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <div className="font-orbitron text-[12px] font-black tracking-widest text-[var(--cyan)] mb-1 select-none">
                AI SIGNAL GENERATION
              </div>
              <p className="font-mono text-[10px] text-slate-400 font-bold leading-normal select-none">
                Realtime signals from mempool scans. Latency: 15ms.
              </p>
            </div>

            {/* 6. Mock P&L Chart */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden relative" style={{ height: '190px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <PnLChart data={state.pnlSeries} loading={false} />
            </div>

            {/* 7. Top Profitable Trades */}
            <div className="shrink-0 hud-panel rounded-2xl bg-[rgba(8,11,26,0.85)] border border-[var(--border)] panel-shadow-cyan overflow-hidden" style={{ height: '185px' }}>
              <span className="hud-corner hud-corner-tl" />
              <span className="hud-corner hud-corner-tr" />
              <span className="hud-corner hud-corner-bl" />
              <span className="hud-corner hud-corner-br" />
              <ProfitableTrades trades={state.trades} />
            </div>
          </aside>
        </div>
      </div>
      
      {/* ── Transaction Intelligence Modal ────────────────────────────── */}
      <AnimatePresence>
        {selectedWhaleEvent && (
          <TxIntelligenceModal 
            event={selectedWhaleEvent} 
            onClose={() => setSelectedWhaleEvent(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
