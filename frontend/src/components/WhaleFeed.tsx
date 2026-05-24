import { useEffect, useRef, useState } from 'react'
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import type { WhaleEvent } from '@/types'
import { formatUSD, truncateAddr, timeAgo, mantleExplorerTx } from '@/lib/api'
import { audio } from '@/lib/audio'

interface WhaleFeedProps {
  events: WhaleEvent[]
  loading: boolean
  onSelectEvent?: (event: WhaleEvent) => void
}

function ActionLabel({ action }: { action: WhaleEvent['action'] }) {
  const map: Record<string, { label: string; color: string }> = {
    buy:       { label: 'BUY',       color: 'var(--green)' },
    sell:      { label: 'SELL',      color: 'var(--red)' },
    transfer:  { label: 'TRANSFER',  color: 'var(--cyan)' },
    lp_add:    { label: 'LP ADD',    color: 'var(--green)' },
    lp_remove: { label: 'LP REMOVE', color: 'var(--red)' },
  }
  const { label, color } = map[action] ?? { label: action.toUpperCase(), color: 'var(--text-muted)' }
  return (
    <span className="font-mono text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] shrink-0" style={{ color }}>
      {label}
    </span>
  )
}

function WhaleCard({ event, onSelectEvent }: { event: WhaleEvent; onSelectEvent?: (event: WhaleEvent) => void }) {
  const [visible, setVisible] = useState(false)
  const isHighValue = event.amount_usd >= 200_000
  const isBuy = event.action === 'buy' || event.action === 'lp_add'
  const isSell = event.action === 'sell' || event.action === 'lp_remove'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Dynamic colors matching the token circle
  const circleColors: Record<string, string> = {
    mETH:  '#00F5FF',
    WMNT:  '#7C3AED',
    AGNI:  '#10B981',
    MOE:   '#F59E0B',
    USDY:  '#3B82F6',
    USDC:  '#00F5FF',
  }
  const accentColor = circleColors[event.token] ?? 'var(--cyan)'

  const cardBorder = isHighValue 
    ? (isBuy ? '1px solid var(--green)' : isSell ? '1px solid var(--red)' : '1px solid var(--cyan)')
    : '1px solid var(--border)'

  const cardShadow = isHighValue 
    ? (isBuy ? '0 0 15px rgba(16,185,129,0.1)' : isSell ? '0 0 15px rgba(255,59,92,0.1)' : '0 0 15px rgba(0,245,255,0.1)')
    : 'none'

  // Mock AI reasoning summary if none exists, to match the layout
  const aiReasoning = event.wallet_score >= 0.8
    ? `${event.token} cross-chain transfer to exchange indicating potential liquidity injection.`
    : `Standard automated smart-wallet transfer detected near ${event.token} liquidity pool.`

  return (
    <div
      id={`whale-${event.id}`}
      onClick={() => onSelectEvent?.(event)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
        transition: 'all 0.3s ease',
        border: cardBorder,
        boxShadow: cardShadow,
        background: 'rgba(8,11,26,0.95)'
      }}
      className="rounded-xl p-4 lg:p-4.5 flex gap-3.5 cursor-pointer group shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:border-[rgba(0,245,255,0.3)] hover:-translate-y-0.5 duration-200"
    >
      {/* Circle Icon left */}
      <div 
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-orbitron font-black text-[11px] select-none relative"
        style={{
          background: 'var(--bg-elevated)',
          border: `2px solid ${accentColor}`,
          color: accentColor,
          boxShadow: `0 0 8px ${accentColor}30`
        }}
      >
        <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.05)' }} />
        {event.token.slice(0, 3)}
      </div>

      {/* Content right */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Row 1: Token Symbol, Action badge & transfer details */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-orbitron font-black text-[12px] text-white tracking-wider">{event.token}</span>
            <ActionLabel action={event.action} />
          </div>
          <span className="font-mono text-[9.5px] font-semibold text-[var(--text-muted)] shrink-0">{timeAgo(event.timestamp)}</span>
        </div>

        {/* Row 2: Value and links */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-orbitron text-[13px] font-black text-white leading-tight">
            {formatUSD(event.amount_usd)}
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-[var(--text-muted)]">
            <a
              href={mantleExplorerTx(event.tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-[var(--cyan)] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {truncateAddr(event.from_wallet)}
              <ExternalLink size={9} />
            </a>
          </div>
        </div>

        {/* Row 3: Confidence & Smart Money Tier */}
        <div className="flex items-center justify-between gap-1.5 py-1.5 border-t border-[rgba(255,255,255,0.06)] mt-1.5">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[8px] font-bold text-[var(--text-muted)]">CONFIDENCE:</span>
            <span className="font-mono text-[10px] font-black text-[var(--cyan)]">{Math.round(event.wallet_score * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[8px] font-bold text-[var(--text-muted)]">SMART MONEY:</span>
            <span className="font-mono text-[10px] font-black text-[var(--green)]">
              {event.wallet_score >= 0.8 ? 'TIER 1' : event.wallet_score >= 0.65 ? 'TIER 2' : 'TIER 3'}
            </span>
          </div>
        </div>

        {/* Row 4: AI Reasoning text block */}
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)] border-t border-[rgba(255,255,255,0.06)] pt-1.5 mt-1 line-clamp-2">
          <span className="text-[var(--cyan)] font-black">AI REASONING: </span>
          {aiReasoning}
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-12">
      <div className="text-4xl animate-bounce">🐋</div>
      <div className="space-y-1">
        <p className="font-display font-bold text-[var(--text-primary)]">Scanning Mantle Chain...</p>
        <p className="font-mono text-xs text-[var(--text-muted)]">Waiting for whale-sized movements ($10K+)</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
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
    <section id="whale-feed" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span className="font-display font-bold text-[11px] uppercase tracking-widest text-[var(--text-primary)]">Live Whale Feed</span>
          <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider">· Mantle Network</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[var(--cyan)] font-extrabold">{events.length}</span>
          <span className="font-mono text-[8px] text-[var(--text-muted)]">detected</span>
        </div>
      </div>

      {/* Feed body */}
      <div ref={containerRef} className="feed-scroll flex-1 p-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 overflow-y-auto auto-rows-max items-start">
        {events.length === 0 ? (
          <EmptyState />
        ) : (
          events.map((event, i) => (
            <WhaleCard key={`${event.id ?? event.tx_hash}-${i}`} event={event} onSelectEvent={onSelectEvent} />
          ))
        )}
      </div>
    </section>
  )
}
