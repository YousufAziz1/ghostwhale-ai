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
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-[var(--text-primary)]">{trade.token}</span>
                  {trade.tx_hash && (
                    <a
                      href={mantleExplorerTx(trade.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="View on explorer"
                    >
                      <ExternalLink size={9} className="text-[var(--text-muted)] hover:text-[var(--accent)]" />
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
