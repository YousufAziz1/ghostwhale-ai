import { useEffect, useRef, useState } from 'react'
import type { WhaleEvent } from '@/types'
import { truncateAddr, timeAgo } from '@/lib/api'
import { audio } from '@/lib/audio'

interface WhaleFeedProps {
  events: WhaleEvent[]
  loading: boolean
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

function WhaleCard({ event }: { event: WhaleEvent }) {
  const [visible, setVisible] = useState(false)
  const confidence = Math.round(event.wallet_score * 100)
  const isBuy = event.action === 'buy' || event.action === 'lp_add'
  const isHighValue = event.amount_usd >= 200_000

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Calculate raw token transfer amount
  const price = TOKEN_PRICES[event.token] ?? 1.0
  const rawAmount = event.amount_usd / price
  const formattedAmount = rawAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })

  const smartMoneyTier = confidence >= 85 ? 'Tier 1' : confidence >= 70 ? 'Tier 2' : 'Tier 3'

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.98)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: isHighValue 
          ? `1.5px solid ${isBuy ? 'rgba(16,185,129,0.45)' : 'rgba(255,59,92,0.45)'}` 
          : '1px solid var(--border)',
        boxShadow: isHighValue 
          ? `0 0 20px ${isBuy ? 'rgba(16,185,129,0.1)' : 'rgba(255,59,92,0.1)'}` 
          : 'none'
      }}
      className="whale-card-custom relative flex flex-col justify-between w-full h-[155px] font-mono select-none"
    >
      <div>
        {/* Header: Logo and symbol */}
        <div className="flex items-center justify-between mb-2">
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
            <span className="font-display font-extrabold text-[12px] text-white tracking-wide">
              {event.token}
            </span>
          </div>
          
          {/* Confidence Mini Progress Bar */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[7px] text-[var(--text-muted)] tracking-wider">
              {timeAgo(event.timestamp)}
            </span>
            <div className="w-12 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${confidence}%`,
                  background: isBuy ? 'var(--cyan)' : 'var(--red)',
                  boxShadow: `0 0 4px ${isBuy ? 'var(--cyan)' : 'var(--red)'}`
                }} 
              />
            </div>
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8.5px] font-mono mb-2 pb-1.5" style={{ borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transfer</span>
            <span className="text-white font-bold truncate">{formattedAmount} {event.token}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Confidence</span>
            <span className="text-[var(--cyan)] font-extrabold">{confidence}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Wallet</span>
            <span className="text-white font-bold truncate">{truncateAddr(event.from_wallet)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Smart Money</span>
            <span className="text-white font-bold">{smartMoneyTier}</span>
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="flex-1 flex flex-col justify-end">
        <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">
          AI Reasoning:
        </span>
        <p className="text-[8px] leading-snug text-slate-400 font-medium line-clamp-2">
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

export default function WhaleFeed({ events, loading }: WhaleFeedProps) {
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
          <span className="font-display font-bold text-xs tracking-wider text-[var(--text-primary)]">LIVE WHALE FEED</span>
          <span className="font-mono text-[8px] text-[var(--text-muted)] tracking-wider">· MANTLE NETWORK</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px]">
          <span className="text-[var(--cyan)] font-bold">{events.length}</span>
          <span className="text-[var(--text-muted)]">detected</span>
        </div>
      </div>

      {/* Grid body */}
      <div 
        ref={containerRef} 
        className="feed-scroll flex-1 p-3 grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto auto-rows-max items-start scrollbar-thin"
      >
        {events.length === 0 ? (
          <div className="col-span-full h-full flex items-center justify-center">
            <EmptyState />
          </div>
        ) : (
          events.map((event, i) => (
            <WhaleCard key={`${event.id ?? event.tx_hash}-${i}`} event={event} />
          ))
        )}
      </div>
    </section>
  )
}
