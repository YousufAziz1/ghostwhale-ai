import { useEffect, useRef } from 'react'
import { ExternalLink, Zap } from 'lucide-react'
import type { WhaleEvent } from '@/types'
import { formatUSD, truncateAddr, timeAgo, mantleExplorerTx } from '@/lib/api'
import { audio } from '@/lib/audio'

interface WhaleFeedProps {
  events: WhaleEvent[]
  loading: boolean
}

function ActionBadge({ action }: { action: WhaleEvent['action'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    buy:       { label: 'BUY',       cls: 'badge-buy' },
    sell:      { label: 'SELL',      cls: 'badge-sell' },
    transfer:  { label: 'TRANSFER',  cls: 'badge-transfer' },
    lp_add:    { label: 'LP ADD',    cls: 'badge-buy' },
    lp_remove: { label: 'LP REMOVE', cls: 'badge-sell' },
  }
  const { label, cls } = map[action] ?? { label: action.toUpperCase(), cls: 'badge-transfer' }
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${cls}`}>
      {label}
    </span>
  )
}

function SmartMoneyBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 70 ? 'var(--accent)' : pct >= 50 ? 'var(--accent-2)' : 'var(--text-muted)'
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-[var(--text-muted)] w-20 shrink-0">Smart Money</span>
      <div className="progress-bar flex-1">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="font-mono text-[10px] w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function WhaleRow({ event, isNew }: { event: WhaleEvent; isNew: boolean }) {
  const isHighValue = event.amount_usd >= 200_000

  return (
    <div
      id={`whale-${event.id}`}
      className={`
        slide-in card p-4 cursor-pointer group
        ${isHighValue ? 'border-[var(--border-active)]' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ActionBadge action={event.action} />
          <span className="font-display font-bold text-[var(--text-primary)]">{event.token}</span>
          {isHighValue && (
            <div className="flex items-center gap-1">
              <Zap size={12} className="text-[var(--accent-yellow)]" />
              <span className="font-mono text-[10px] text-[var(--accent-yellow)]">HIGH VALUE</span>
            </div>
          )}
        </div>
        <span className="font-mono text-xs text-[var(--text-muted)]">{timeAgo(event.timestamp)}</span>
      </div>

      <div className="mb-3">
        <span className="font-display text-2xl font-bold text-gradient-green">
          {formatUSD(event.amount_usd)}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-3 font-mono text-xs text-[var(--text-muted)]">
        <a
          href={mantleExplorerTx(event.tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {truncateAddr(event.from_wallet)}
          <ExternalLink size={10} />
        </a>
        <span className="text-[var(--text-faint)]">→</span>
        <span>{truncateAddr(event.to_wallet)}</span>
      </div>

      <SmartMoneyBar score={event.wallet_score} />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="flex gap-2">
          <div className="h-4 w-12 bg-[var(--border-subtle)] rounded-full" />
          <div className="h-4 w-16 bg-[var(--border-subtle)] rounded" />
        </div>
        <div className="h-3 w-16 bg-[var(--border-subtle)] rounded" />
      </div>
      <div className="h-7 w-32 bg-[var(--border-subtle)] rounded mb-3" />
      <div className="h-3 w-48 bg-[var(--border-subtle)] rounded mb-3" />
      <div className="h-2 w-full bg-[var(--border-subtle)] rounded" />
    </div>
  )
}

export default function WhaleFeed({ events, loading }: WhaleFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (events.length > prevLen.current && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    prevLen.current = events.length
  }, [events.length])

  return (
    <section id="whale-feed" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="live-dot" />
          <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
            Whale Feed
          </span>
        </div>
        <span className="font-mono text-xs text-[var(--text-muted)]">
          {events.length} events
        </span>
      </div>

      {/* Feed */}
      <div ref={containerRef} className="feed-scroll flex-1 p-3 flex flex-col gap-2">
        {loading && events.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
            <span className="text-4xl">🐋</span>
            <p className="font-mono text-xs">Scanning Mantle for whales…</p>
          </div>
        ) : (
          events.map((event, i) => (
            <WhaleRow key={event.id ?? event.tx_hash} event={event} isNew={i === 0} />
          ))
        )}
      </div>
    </section>
  )
}
