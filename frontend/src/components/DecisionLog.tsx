import type { Trade } from '@/types'
import { formatUSD, timeAgo, truncateAddr, mantleExplorerTx } from '@/lib/api'
import { ExternalLink } from 'lucide-react'

interface DecisionLogProps {
  trades: Trade[]
  loading: boolean
}

function OutcomeBadge({ trade }: { trade: Trade }) {
  if (!trade.settled) {
    return <span className="font-mono text-[10px] text-[var(--text-muted)] animate-pulse">OPEN</span>
  }
  const pnl = trade.pnl_usd ?? 0
  const cls = pnl >= 0 ? 'text-[var(--accent)]' : 'text-[var(--accent-red)]'
  return (
    <span className={`font-mono text-[10px] font-bold ${cls}`}>
      {pnl >= 0 ? '✅' : '❌'} {formatUSD(pnl)}
    </span>
  )
}

function DirectionCell({ direction }: { direction: string }) {
  const cls =
    direction === 'BUY'  ? 'text-[var(--accent)]' :
    direction === 'SELL' ? 'text-[var(--accent-red)]' :
    'text-[var(--accent-yellow)]'
  return <span className={`font-mono text-xs font-bold ${cls}`}>{direction}</span>
}

function SkeletonLog() {
  return (
    <div className="space-y-1 animate-pulse p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-8 bg-[var(--border-subtle)] rounded" />
      ))}
    </div>
  )
}

export default function DecisionLog({ trades, loading }: DecisionLogProps) {
  return (
    <section id="decision-log" className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
          Decision Log
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--accent-glow)] px-2 py-0.5 rounded-full">
          ALL PUBLIC
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Column headers */}
        <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-[var(--border-subtle)]">
          {['Time', 'Token', 'Signal', 'Conf', 'P&L'].map(h => (
            <span key={h} className="font-mono text-[10px] text-[var(--text-faint)] uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="feed-scroll flex-1">
          {loading && trades.length === 0 ? (
            <SkeletonLog />
          ) : trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
              <span className="text-3xl">📋</span>
              <p className="font-mono text-xs">No trades recorded yet</p>
            </div>
          ) : (
            trades.map((trade, i) => (
              <div
                key={trade.id}
                id={`trade-row-${trade.id}`}
                className={`
                  grid grid-cols-5 gap-2 px-3 py-2 border-b border-[var(--border-subtle)]/50
                  hover:bg-[var(--bg-elevated)] transition-colors group
                  ${i === 0 ? 'slide-in' : ''}
                `}
              >
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {timeAgo(trade.timestamp)}
                </span>
                <div className="flex flex-col gap-0.5 justify-center min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[var(--text-primary)] font-bold">{trade.token}</span>
                    {trade.mock === 0 ? (
                      <span className="font-mono text-[7px] font-black px-1 py-0.2 rounded bg-green-500/10 text-[var(--green)] border border-green-500/20 shrink-0 select-none shadow-[0_0_6px_rgba(16,185,129,0.1)]">LIVE</span>
                    ) : (
                      <span className="font-mono text-[7px] font-black px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 select-none">DEMO</span>
                    )}
                  </div>
                  {trade.tx_hash && (
                    <a
                      href={mantleExplorerTx(trade.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[8px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-0.5 mt-0.5 shrink-0"
                      aria-label="View on explorer"
                    >
                      {truncateAddr(trade.tx_hash)}
                      <ExternalLink size={7} />
                    </a>
                  )}
                </div>
                <DirectionCell direction={trade.direction} />
                <span className="font-mono text-[10px] text-[var(--accent-2)]">
                  {Math.round((trade.confidence ?? 0) * 100)}%
                </span>
                <OutcomeBadge trade={trade} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
