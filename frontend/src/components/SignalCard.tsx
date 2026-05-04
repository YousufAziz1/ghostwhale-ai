import { useEffect, useState } from 'react'
import { ExternalLink, Clock } from 'lucide-react'
import type { Signal } from '@/types'
import { formatUSD, truncateAddr, mantleExplorerTx, timeAgo } from '@/lib/api'

interface SignalCardProps {
  signal: Signal | null
  loading: boolean
}

// Circular confidence SVG meter
function ConfidenceRing({ confidence }: { confidence: number }) {
  const R    = 40
  const circ = 2 * Math.PI * R
  const pct  = Math.max(0, Math.min(1, confidence))
  const dash = circ * pct
  const gap  = circ - dash

  const color =
    pct >= 0.80 ? '#00ff88' :
    pct >= 0.65 ? '#00d4ff' :
    '#ffd700'

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="112" height="112" className="confidence-ring absolute inset-0">
        {/* Track */}
        <circle cx="56" cy="56" r={R} fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
        {/* Fill */}
        <circle
          cx="56" cy="56" r={R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          className="confidence-ring-fill"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="font-mono font-bold text-xl" style={{ color }}>
          {Math.round(pct * 100)}%
        </div>
        <div className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">CONF</div>
      </div>
    </div>
  )
}

// Countdown timer for HIGH urgency signals
function Countdown({ fromIso }: { fromIso: string }) {
  const [remaining, setRemaining] = useState(0)
  const DURATION = 30 * 60 // 30 min window

  useEffect(() => {
    const update = () => {
      const elapsed = (Date.now() - new Date(fromIso).getTime()) / 1000
      setRemaining(Math.max(0, DURATION - elapsed))
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [fromIso])

  const mins = Math.floor(remaining / 60)
  const secs = Math.floor(remaining % 60)
  const expired = remaining <= 0

  return (
    <div className={`flex items-center gap-2 ${expired ? 'opacity-40' : ''}`}>
      <Clock size={12} className="text-[var(--accent-yellow)]" />
      <span className="font-mono text-xs text-[var(--accent-yellow)]">
        {expired ? 'EXPIRED' : `${mins}:${secs.toString().padStart(2, '0')} remaining`}
      </span>
    </div>
  )
}

function DirectionBadge({ direction }: { direction: Signal['direction'] }) {
  const config: Record<Signal['direction'], { cls: string; label: string }> = {
    BUY:  { cls: 'text-[var(--accent)]  border-[var(--accent)]  bg-[rgba(0,255,136,0.08)]', label: '▲ BUY' },
    SELL: { cls: 'text-[var(--accent-red)] border-[var(--accent-red)] bg-[rgba(255,68,102,0.08)]', label: '▼ SELL' },
    HOLD: { cls: 'text-[var(--accent-yellow)] border-[var(--accent-yellow)] bg-[rgba(255,215,0,0.08)]', label: '◆ HOLD' },
  }
  const { cls, label } = config[direction]

  return (
    <div className={`
      inline-flex items-center justify-center
      border rounded-xl px-6 py-2 shadow-inner
      font-display font-bold text-3xl tracking-wider
      ${cls}
    `}>
      {label}
    </div>
  )
}

function UrgencyBadge({ urgency }: { urgency: Signal['urgency'] }) {
  const config: Record<Signal['urgency'], { cls: string; emoji: string }> = {
    HIGH:   { cls: 'badge-sell pulse-cyan', emoji: '🚨' },
    MEDIUM: { cls: 'badge-transfer', emoji: '⚡' },
    LOW:    { cls: 'badge-hold', emoji: '📊' },
  }
  const { cls, emoji } = config[urgency]
  return (
    <span className={`font-mono text-[10px] px-2 py-1 rounded-full tracking-wider ${cls}`}>
      {emoji} {urgency}
    </span>
  )
}

function SkeletonSignal() {
  return (
    <div className="card p-6 animate-pulse flex flex-col gap-4">
      <div className="h-6 w-24 bg-[var(--border-subtle)] rounded-full" />
      <div className="flex justify-between items-center">
        <div className="h-14 w-40 bg-[var(--border-subtle)] rounded-xl" />
        <div className="w-28 h-28 bg-[var(--border-subtle)] rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 bg-[var(--border-subtle)] rounded" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function SignalCard({ signal, loading }: SignalCardProps) {
  if (loading && !signal) return <SkeletonSignal />

  if (!signal) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="text-5xl">🔍</span>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          Waiting for first whale signal…
        </p>
        <p className="font-mono text-[10px] text-[var(--text-faint)]">
          Scanning Mantle every 15s
        </p>
      </div>
    )
  }

  const isHigh = signal.urgency === 'HIGH'

  return (
    <article
      id="signal-card"
      className={`card slide-in flex flex-col gap-5 p-5 ${isHigh ? 'border-[var(--border-active)] glow-green' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm text-[var(--text-primary)]">
            {signal.token}
          </span>
          <UrgencyBadge urgency={signal.urgency} />
        </div>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {timeAgo(signal.timestamp)}
        </span>
      </div>

      {/* Direction + confidence */}
      <div className="flex items-center justify-between gap-4">
        <DirectionBadge direction={signal.direction} />
        <ConfidenceRing confidence={signal.confidence} />
      </div>

      {/* Countdown for HIGH urgency */}
      {isHigh && <Countdown fromIso={signal.timestamp} />}

      {/* AI Reasoning */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
        <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
          AI Reasoning
        </p>
        <p className="font-body text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
          {signal.reasoning}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] text-[var(--text-muted)] mb-1">Suggested Size</p>
          <p className="font-display font-bold text-[var(--accent)]">
            {formatUSD(signal.suggested_size_usd)}
          </p>
        </div>
        {signal.whale_event_tx && (
          <a
            href={mantleExplorerTx(signal.whale_event_tx)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            {truncateAddr(signal.whale_event_tx, 8, 6)}
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    </article>
  )
}
