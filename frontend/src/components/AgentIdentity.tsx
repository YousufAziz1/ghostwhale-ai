import type { AgentIdentity as AgentIdentityType, AgentStats } from '@/types'
import { ExternalLink, Shield, Zap, TrendingUp, Activity } from 'lucide-react'
import { formatUSD } from '@/lib/api'

interface AgentIdentityProps {
  identity: AgentIdentityType | null
  stats: AgentStats | null
  loading: boolean
}

function ReputationArc({ score }: { score: number }) {
  const pct = score / 1000
  const R   = 52
  const circ = Math.PI * R            // half-circle circumference
  const fill  = circ * pct
  const color = score >= 700 ? '#00ff88' : score >= 400 ? '#00d4ff' : '#ff4466'

  return (
    <div className="relative flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Track (half-circle) */}
        <path
          d="M 8 64 A 52 52 0 0 1 112 64"
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 8 64 A 52 52 0 0 1 112 64"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute top-7 text-center">
        <div className="font-mono font-bold text-2xl" style={{ color }}>{score}</div>
        <div className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">/ 1000</div>
      </div>
    </div>
  )
}

function StatItem({ label, value, color = 'var(--text-primary)', icon: Icon }: {
  label: string; value: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-[var(--text-muted)]">
        {Icon && <Icon size={10} />}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-display font-bold text-sm" style={{ color }}>{value}</span>
    </div>
  )
}

function SkeletonIdentity() {
  return (
    <div className="card p-5 animate-pulse flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[var(--border-subtle)]" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-36 bg-[var(--border-subtle)] rounded" />
          <div className="h-3 w-20 bg-[var(--border-subtle)] rounded" />
        </div>
      </div>
      <div className="h-20 bg-[var(--border-subtle)] rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--border-subtle)] rounded" />
        ))}
      </div>
    </div>
  )
}

export default function AgentIdentityCard({ identity, stats, loading }: AgentIdentityProps) {
  if (loading && !identity) return <SkeletonIdentity />

  const repScore = identity?.reputation_score ?? stats?.reputation_score ?? 500
  const winRate  = identity?.win_rate_pct     ?? stats?.win_rate_pct     ?? 0
  const totalSig = identity?.total_signals    ?? stats?.total_signals    ?? 0
  const totalPnL = identity?.total_pnl_usd    ?? stats?.total_pnl_usd    ?? 0
  const settled  = identity?.settled_trades   ?? stats?.settled_trades   ?? 0
  const mode     = identity?.mode ?? 'MOCK'

  return (
    <article id="agent-identity" className="card border-spin-wrapper flex flex-col gap-4 p-5">
      {/* Agent header */}
      <div className="flex items-center gap-3">
        {/* Ghost whale logo */}
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--border-active)] flex items-center justify-center text-2xl shrink-0">
          🐋
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[var(--text-primary)] truncate">
              {identity?.name ?? 'GhostWhale-001'}
            </span>
            <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${
              mode === 'MOCK'
                ? 'text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30 bg-[rgba(255,215,0,0.08)]'
                : 'badge-buy'
            }`}>
              {mode}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Shield size={10} className="text-[var(--accent-2)]" />
            <span className="font-mono text-[10px] text-[var(--accent-2)]">
              {identity?.standard ?? 'ERC-8004'}
            </span>
            <span className="text-[var(--text-faint)] mx-1">·</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {identity?.network ?? 'Mantle Mainnet'}
            </span>
          </div>
        </div>
      </div>

      {/* Reputation arc */}
      <div className="flex flex-col items-center py-2">
        <ReputationArc score={repScore} />
        <span className="font-mono text-[10px] text-[var(--text-muted)] mt-1 tracking-wider">
          REPUTATION SCORE
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-subtle)]">
        <StatItem
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          color={winRate >= 55 ? 'var(--accent)' : 'var(--accent-red)'}
          icon={Activity}
        />
        <StatItem
          label="Total P&L"
          value={formatUSD(totalPnL)}
          color={totalPnL >= 0 ? 'var(--accent)' : 'var(--accent-red)'}
          icon={TrendingUp}
        />
        <StatItem
          label="Signals"
          value={totalSig.toString()}
          icon={Zap}
        />
        <StatItem
          label="Trades"
          value={settled.toString()}
        />
      </div>

      {/* NFT link */}
      {identity?.explorer_url && (
        <a
          href={identity.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-active)] hover:bg-[var(--accent-glow)] transition-all font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          View Agent NFT on Mantle
          <ExternalLink size={11} />
        </a>
      )}

      {!identity?.explorer_url && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-faint)]">
          NFT not deployed · set AGENT_NFT_ADDRESS
        </div>
      )}
    </article>
  )
}
