import type { Trade } from '@/types'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatUSD } from '@/lib/api'

export default function ProfitableTrades({ trades }: { trades: Trade[] }) {
  // Show settled trades with PnL, sorted best first
  const sorted = trades
    .filter(t => t.settled === 1 && t.pnl_usd !== null)
    .sort((a, b) => (b.pnl_usd || 0) - (a.pnl_usd || 0))
    .slice(0, 6)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-black/30">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <TrendingUp size={13} />
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Top Profitable Trades</span>
        </div>
        <span className="font-mono text-[9px] text-[var(--text-muted)]">{sorted.length} closed</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-mono text-xs text-center px-3">
            <span className="opacity-50 italic">Waiting for closed positions...</span>
          </div>
        ) : (
          sorted.map((t, idx) => {
            const pnl = t.pnl_usd ?? 0
            const isProfit = pnl >= 0
            const pct = t.pnl_pct != null ? t.pnl_pct : (pnl / (t.size_usd || 1000)) * 100
            return (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg border animate-pop-in"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  background: isProfit ? 'rgba(0,255,136,0.05)' : 'rgba(255,30,86,0.05)',
                  borderColor: isProfit ? 'rgba(0,255,136,0.2)' : 'rgba(255,30,86,0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                    style={{
                      background: isProfit ? 'rgba(0,255,136,0.12)' : 'rgba(255,30,86,0.12)',
                      color: isProfit ? 'var(--accent)' : 'var(--accent-red)',
                    }}
                  >
                    {t.token.slice(0, 3)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-[var(--text-primary)]">
                      {t.direction === 'BUY' ? '▲' : '▼'} {t.token}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--text-muted)]">
                      {formatUSD(t.size_usd)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className="font-mono font-bold text-sm"
                    style={{ color: isProfit ? 'var(--accent)' : 'var(--accent-red)' }}
                  >
                    {isProfit ? '+' : ''}{pct.toFixed(1)}%
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: isProfit ? 'var(--accent)' : 'var(--accent-red)' }}
                  >
                    {isProfit ? '+' : ''}{formatUSD(pnl)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
