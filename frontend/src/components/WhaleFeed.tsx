import { useEffect, useRef, useState } from 'react'
import type { WhaleEvent } from '@/types'
import { truncateAddr, timeAgo, mantleExplorerTx } from '@/lib/api'
import { audio } from '@/lib/audio'
import { ExternalLink, Zap } from 'lucide-react'

interface WhaleFeedProps {
  events: WhaleEvent[]
  loading: boolean
  onSelectEvent?: (event: WhaleEvent) => void
}

const TOKEN_PRICES: Record<string, number> = {
  MNT: 1.10,
  WMNT: 1.10,
  mETH: 3800.0,
  ETH: 3800.0,
  USDT: 1.00,
  USDC: 1.00,
  USDY: 1.05,
  WETH: 3800.0,
  AGNI: 0.0412,
  MOE: 0.00823
}

const TOKEN_ICONS: Record<string, string> = {
  MNT: '🐋',
  WMNT: '🪙',
  mETH: '💧',
  ETH: '🔷',
  USDT: '💵',
  USDC: '💵',
  USDY: '📈',
  AGNI: '🔥',
  MOE: '🦊',
  default: '💎'
}

function CardSparkline({ data, color, gradId }: { data: number[]; color: string; gradId: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 55, h = 13
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  const safeId = gradId.replace(/[^a-zA-Z0-9-]/g, '')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={safeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${safeId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getAIReasoning(token: string, action: string): string {
  const t = token.toUpperCase()
  if (t === 'MNT' || t === 'WMNT') {
    return 'MNT cross-chain transfer to AGNI exchange indicating potential liquidity injection.'
  } else if (t === 'AGNI' || t === 'MOE') {
    return `${t} liquidity pool accumulation detected on Merchant Moe router indicating smart money interest.`
  } else if (t === 'METH' || t === 'ETH') {
    return `${t} smart money wallet accumulation indicating potential bullish breakout.`
  }
  return `Aggressive ${action} block transfer detected. AI Engine flags potential volatile price momentum.`
}

function WhaleCard({ event, onSelect }: { event: WhaleEvent; onSelect?: () => void }) {
  const [visible, setVisible] = useState(false)
  const confidence = Math.round(event.wallet_score * 100)
  const isBuy = event.action === 'buy' || event.action === 'lp_add'
  const isHighValue = event.amount_usd >= 250_000

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Calculate raw token transfer amount
  const price = TOKEN_PRICES[event.token] ?? 1.0
  const rawAmount = event.amount_usd / price
  const formattedAmount = rawAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const smartMoneyTier = confidence >= 85 ? 'Tier 1' : confidence >= 70 ? 'Tier 2' : 'Tier 3'
  const gas = event.gas_fee ?? '0.0042 MNT'
  const source = event.chain_source ?? 'Mantle'
  const mockSpark = event.sparkline_data ?? [40, 45, 42, 48, 46, 52, 50, 58]

  // Dynamic conic border glows for high-value cards
  const cardBorderClass = isHighValue
    ? (isBuy ? 'border-glow-conic' : 'border-glow-conic-warn')
    : (isBuy ? 'card-glow-green border border-[rgba(16,185,129,0.15)]' : 'card-glow-red border border-[rgba(255,59,92,0.15)]')

  return (
    <div
      onClick={onSelect}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, -10px, 0) scale(0.98)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className={`whale-card-custom relative flex flex-col justify-between w-full h-[185px] font-mono select-none cursor-pointer gpu-accelerated p-4 ${cardBorderClass}`}
    >
      {/* Holographic Overlays */}
      <div className="holo-reflection" />
      <div className="whale-card-scanline" />

      <div>
        {/* Header: Logo and symbol */}
        <div className="flex items-center justify-between mb-2.5 z-10 relative">
          <div className="flex items-center gap-2">
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
              style={{
                background: isBuy 
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(0,245,255,0.15) 100%)' 
                  : 'linear-gradient(135deg, rgba(255,59,92,0.15) 0%, rgba(124,58,237,0.15) 100%)',
                border: `1.2px solid ${isBuy ? 'rgba(16,185,129,0.4)' : 'rgba(255,59,92,0.4)'}`,
              }}
            >
              {TOKEN_ICONS[event.token] ?? TOKEN_ICONS.default}
            </div>
            <span className="font-display font-extrabold text-[13.5px] text-white tracking-wide flex items-center gap-1.5">
              {event.token}
              {isHighValue && (
                <span className={`text-[7px] font-black px-1 rounded uppercase tracking-wider ${
                  isBuy ? 'blink-tag-green bg-emerald-950/20 text-emerald-400 border border-emerald-500/30' : 'blink-tag-red bg-rose-950/20 text-rose-400 border border-rose-500/30'
                }`}>
                  HV
                </span>
              )}
            </span>
          </div>
          
          {/* Confidence Mini Progress Bar */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[8px] text-[var(--text-muted)] tracking-wider font-bold">
              {timeAgo(event.timestamp)}
            </span>
            <div className="w-12 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${confidence}%`,
                  background: isBuy ? 'var(--green)' : 'var(--red)',
                  boxShadow: `0 0 4px ${isBuy ? 'var(--green)' : 'var(--red)'}`
                }} 
              />
            </div>
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-mono mb-2 pb-1.5 border-b border-[rgba(255,255,255,0.03)] z-10 relative">
          <div className="flex flex-col">
          <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transfer</span>
            <span className="text-white font-bold truncate text-[9.5px]">{formattedAmount} {event.token}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Confidence</span>
            <span className="text-[var(--cyan)] font-extrabold text-[10px]">{confidence}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Wallet</span>
            <span className="text-white font-bold truncate text-[9.5px]">{truncateAddr(event.from_wallet)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Smart Money</span>
            <span className="text-white font-bold text-[9.5px]">{smartMoneyTier}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Gas / Net</span>
            <span className="text-slate-400 font-medium truncate text-[9px]">{gas} / {source}</span>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-0.5">Price Trend</span>
            <CardSparkline data={mockSpark} color={isBuy ? '#10B981' : '#FF3B5C'} gradId={`sp-${event.id}-${event.token}`} />
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="flex-1 flex flex-col justify-end z-10 relative">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            AI Reasoning:
          </span>
          <span 
            onClick={(e) => {
              e.stopPropagation()
              window.open(mantleExplorerTx(event.tx_hash), '_blank')
            }}
            className="text-[6.5px] text-[var(--cyan)] hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            explorer
            <ExternalLink size={6} />
          </span>
        </div>
        <p className="text-[9px] leading-relaxed text-slate-300 font-medium line-clamp-2 mt-0.5">
          {getAIReasoning(event.token, event.action)}
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4 py-8">
      <div className="text-4xl animate-pulse">🐋</div>
      <div className="space-y-0.5">
        <p className="font-display font-bold text-[var(--text-primary)] text-sm">Scanning Mantle Chain...</p>
        <p className="font-mono text-[9px] text-[var(--text-muted)]">Waiting for large block movements</p>
      </div>
    </div>
  )
}

export default function WhaleFeed({ events, loading, onSelectEvent }: WhaleFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(events.length)

  useEffect(() => {
    if (events.length > prevLen.current && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      if (events.length - prevLen.current >= 1) audio.playPing()
    }
    prevLen.current = events.length
  }, [events.length])

  return (
    <section id="whale-feed" className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="font-display font-bold text-sm tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Zap size={12} className="text-[var(--cyan)]" />
              LIVE WHALE FEED
            </span>
            <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">· MANTLE NETWORK</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px]">
          <span className="text-[var(--cyan)] font-bold text-[11px]">{events.length}</span>
            <span className="text-[var(--text-muted)] text-[9px]">detected</span>
        </div>
      </div>

      {/* Grid body */}
      <div 
        ref={containerRef} 
        className="feed-scroll flex-1 p-3 grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto auto-rows-max items-start scrollbar-thin"
      >
        {events.length === 0 ? (
          <div className="col-span-full h-full flex items-center justify-center">
            <EmptyState />
          </div>
        ) : (
          events.map((event, i) => (
            <WhaleCard 
              key={`${event.id ?? event.tx_hash}-${i}`} 
              event={event} 
              onSelect={() => onSelectEvent?.(event)}
            />
          ))
        )}
      </div>
    </section>
  )
}
