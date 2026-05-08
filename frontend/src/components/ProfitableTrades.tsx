import type { Trade } from '@/types'
import { TrendingUp } from 'lucide-react'

export default function ProfitableTrades({ trades }: { trades: Trade[] }) {
  // Filter for settled trades and sort by PnL
  const settled = trades.filter(t => t.status === 'SETTLED' && t.pnl_usd !== undefined && t.pnl_usd > 0)
    .sort((a, b) => (b.pnl_usd || 0) - (a.pnl_usd || 0))
    .slice(0, 5)

  return (
    <div className="card border-spin-wrapper flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--accent-glow)]">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <TrendingUp size={14} />
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Top Profitable Trades</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {settled.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)] font-mono text-xs">
            Waiting for closed positions...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {settled.map(t => {
              const pnl = t.pnl_usd || 0
              // Calculate a mock percentage for hackathon wow-factor
              const mockPct = ((pnl / (t.amount_usd || 1000)) * 100).toFixed(1)
              return (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] animate-pop-in">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent-glow)] text-[var(--accent)] flex items-center justify-center font-bold text-xs">
                      {t.token.slice(0, 3)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-[var(--text-primary)]">{t.token} Buy</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">Vol: ${t.amount_usd.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono font-bold text-sm text-[var(--accent)]">+{mockPct}%</span>
                    <span className="font-mono text-[10px] text-[var(--accent)]">+${pnl.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
