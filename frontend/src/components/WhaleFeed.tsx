import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import type { WhaleEvent } from '@/types'
import { formatUSD, truncateAddr, timeAgo, mantleExplorerTx } from '@/lib/api'
import { audio } from '@/lib/audio'

interface WhaleFeedProps {
  events: WhaleEvent[]
  loading: boolean
}

function ActionBadge({ action }: { action: WhaleEvent['action'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    buy:       { label: '▲ BUY',       cls: 'badge-buy' },
    sell:      { label: '▼ SELL',      cls: 'badge-sell' },
    transfer:  { label: '→ TRANSFER',  cls: 'badge-transfer' },
    lp_add:    { label: '+ LP ADD',    cls: 'badge-buy' },
    lp_remove: { label: '- LP REMOVE', cls: 'badge-sell' },
  }
  const { label, cls } = map[action] ?? { label: action.toUpperCase(), cls: 'badge-transfer' }
  return (
    <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${cls}`}>
      {label}
    </span>
  )
}

function ExpectedMove({ action, score }: { action: WhaleEvent['action']; score: number }) {
  const isBuy = action === 'buy' || action === 'lp_add'
  const pct = (score * 15).toFixed(1)
  if (!isBuy && action !== 'sell') return null
  return (
    <div className={`flex items-center gap-1 font-mono text-xs font-bold ${isBuy ? 'text-[var(--accent)]' : 'text-[var(--accent-red)]'}`}>
      {isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      <span>AI Target: {isBuy ? '+' : '-'}{pct}%</span>
    </div>
  )
}

function SmartMoneyBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? 'var(--accent)' : pct >= 60 ? 'var(--accent-2)' : 'var(--accent-yellow)'
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-[var(--text-muted)] w-20 shrink-0">Smart Money</span>
      <div className="progress-bar flex-1">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <span className="font-mono text-[10px] w-8 text-right font-bold" style={{ color }}>{pct}%</span>
    </div>
  )
}

function WhaleCard({ event, isNew }: { event: WhaleEvent; isNew: boolean }) {
  const [visible, setVisible] = useState(false)
  const isHighValue = event.amount_usd >= 200_000
  const isBuy = event.action === 'buy' || event.action === 'lp_add'

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const glowColor = isBuy ? 'var(--accent-glow)' : event.action === 'sell' ? 'var(--red-glow)' : 'var(--cyan-glow)'
  const borderColor = isBuy ? 'var(--border-active)' : event.action === 'sell' ? 'var(--accent-red)' : 'var(--border-cyan)'

  return (
    <div
      id={`whale-${event.id}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.97)',
        transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        borderColor: isHighValue ? borderColor : undefined,
        boxShadow: isHighValue ? `0 0 20px ${glowColor}` : undefined,
      }}
      className={`card p-4 cursor-pointer group border ${isHighValue ? '' : 'border-[var(--border-subtle)]'}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBadge action={event.action} />
          <span className="font-display font-bold text-[var(--text-primary)]">{event.token}</span>
          {isHighValue && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30">
              <Zap size={10} className="text-[var(--accent-yellow)]" />
              <span className="font-mono text-[9px] text-[var(--accent-yellow)] font-bold">HIGH VALUE</span>
            </div>
          )}
        </div>
        <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{timeAgo(event.timestamp)}</span>
      </div>

      {/* Amount */}
      <div className="mb-2 flex items-center justify-between">
        <span className={`font-display text-xl font-bold ${isBuy ? 'text-gradient-green' : 'text-[var(--accent-red)]'}`}>
          {formatUSD(event.amount_usd)}
        </span>
        <ExpectedMove action={event.action} score={event.wallet_score} />
      </div>

      {/* Wallets */}
      <div className="flex items-center gap-1 mb-3 font-mono text-[10px] text-[var(--text-muted)]">
        <a
          href={mantleExplorerTx(event.tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--accent-2)] transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {truncateAddr(event.from_wallet)}
          <ExternalLink size={9} />
        </a>
        <span className="text-[var(--text-faint)] mx-1">→</span>
        <span>{truncateAddr(event.to_wallet)}</span>
      </div>

      <SmartMoneyBar score={event.wallet_score} />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
      <div className="text-5xl animate-bounce">🐋</div>
      <div className="space-y-1">
        <p className="font-display font-bold text-[var(--text-primary)]">Scanning Mantle Chain...</p>
        <p className="font-mono text-xs text-[var(--text-muted)]">Waiting for whale-sized movements ($10K+)</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
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
    <section id="whale-feed" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span className="font-display font-semibold text-sm text-[var(--text-primary)]">Live Whale Feed</span>
          <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">· Mantle Mainnet</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--accent)] font-bold">{events.length}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">detected</span>
        </div>
      </div>

      {/* Feed body */}
      <div ref={containerRef} className="feed-scroll flex-1 p-3 flex flex-col gap-2 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState />
        ) : (
          events.map((event, i) => (
            <WhaleCard key={`${event.id ?? event.tx_hash}-${i}`} event={event} isNew={i === 0} />
          ))
        )}
      </div>
    </section>
  )
}
