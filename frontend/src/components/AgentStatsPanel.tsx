import { motion } from 'framer-motion'
import type { AgentIdentity, AgentStats } from '@/types'
import { formatUSD, truncateAddr } from '@/lib/api'

interface AgentStatsProps {
  identity: AgentIdentity | null
  stats: AgentStats | null
  loading: boolean
  statusPhrase: string
}

function PortfolioCircle({ token, pct, color, centerText }: { token: string; pct: number; color: string; centerText?: string }) {
  const size = 44
  const R = size / 2 - 3
  const circ = 2 * Math.PI * R
  const strokeDashoffset = circ * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" />
          <circle
            cx={size / 2} cy={size / 2} r={R}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-orbitron font-bold text-[8.5px] text-white">
            {centerText ?? `${pct}%`}
          </span>
        </div>
      </div>
      <span className="font-mono text-[8px] tracking-wider text-[var(--text-muted)] font-bold">{token}</span>
    </div>
  )
}

function RiskMatrixRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between text-[8px] font-mono py-0.5">
      <span className="text-[var(--text-muted)] w-10 uppercase font-bold">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 12 }).map((_, idx) => {
          const val = idx + 1
          const isActive = val <= score
          let colorClass = ''
          if (isActive) {
            if (val <= 4) colorClass = 'green'
            else if (val <= 8) colorClass = 'yellow'
            else if (val <= 10) colorClass = 'orange'
            else colorClass = 'red'
          }
          return <div key={idx} className={`risk-matrix-cell ${colorClass}`} style={{ width: '8px', height: '6px' }} />
        })}
      </div>
    </div>
  )
}

export default function AgentStatsPanel({ identity, stats, loading, statusPhrase }: AgentStatsProps) {
  const repScore = identity?.reputation_score ?? stats?.reputation_score ?? 980
  const winRate  = identity?.win_rate_pct ?? stats?.win_rate_pct ?? 72.5
  const totalPnL = identity?.total_pnl_usd ?? stats?.total_pnl_usd ?? 5432.10
  const signals  = identity?.total_signals ?? stats?.total_signals ?? 1204
  const settled  = identity?.settled_trades ?? stats?.settled_trades ?? 651

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-0 bg-[var(--bg-surface)] font-sans select-none scrollbar-thin">
      
      {/* ── DIAGNOSTICS PANEL ────────────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3 uppercase">
          DIAGNOSTICS PANEL
        </div>

        {/* AI status and reputation boxes side-by-side */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div 
            className="rounded-lg p-2 flex flex-col justify-between h-[46px] bg-black/20"
            style={{
              border: '1px solid rgba(255, 59, 92, 0.45)',
              boxShadow: '0 0 12px rgba(255, 59, 92, 0.08)'
            }}
          >
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">AI AGENT STATUS:</span>
            <span className="font-orbitron text-[9.5px] font-black text-[var(--red)] animate-pulse tracking-wide">HUNTING (ACTIVE)</span>
          </div>

          <div 
            className="rounded-lg p-2 flex flex-col justify-between h-[46px] bg-black/20"
            style={{
              border: '1px solid rgba(0, 245, 255, 0.45)',
              boxShadow: '0 0 12px rgba(0, 245, 255, 0.08)'
            }}
          >
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">REP SCORE:</span>
            <span className="font-orbitron text-[10.5px] font-black text-[var(--cyan)] tracking-wide">
              {Math.round(repScore / 10)}/100
            </span>
          </div>
        </div>

        {/* Stats 2-column grid cards */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-lg p-2 flex flex-col justify-between h-13 bg-black/20 border border-[rgba(0,245,255,0.15)] shadow-[0_0_10px_rgba(0,245,255,0.03)]">
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">WIN RATE</span>
            <span className="font-orbitron text-[11px] font-bold text-white">{winRate.toFixed(1)}%</span>
          </div>
          <div className="rounded-lg p-2 flex flex-col justify-between h-13 bg-black/20 border border-[rgba(16,185,129,0.3)] shadow-[0_0_10px_rgba(16,185,129,0.03)]">
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">TOTAL PNL</span>
            <span className={`font-orbitron text-[11px] font-bold ${totalPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {totalPnL >= 0 ? '+' : ''}{formatUSD(totalPnL)}
            </span>
          </div>
          <div className="rounded-lg p-2 flex flex-col justify-between h-13 bg-black/20 border border-white/5">
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">SIGNALS GENERATED</span>
            <span className="font-orbitron text-[11px] font-bold text-white">{signals.toLocaleString()}</span>
          </div>
          <div className="rounded-lg p-2 flex flex-col justify-between h-13 bg-black/20 border border-white/5">
            <span className="font-mono text-[7px] text-[var(--text-muted)] uppercase tracking-wider font-bold">EXECUTED TRADES</span>
            <span className="font-orbitron text-[11px] font-bold text-white">{settled.toLocaleString()}</span>
          </div>
        </div>

        {/* ERC-8004 Identity */}
        <div className="rounded-lg p-2.5 flex items-center justify-between bg-black/20 border border-white/5 text-[8px] font-mono mt-1">
          <span className="text-[var(--text-muted)] font-bold">ERC-8004 IDENTITY</span>
          <span className="text-[var(--cyan)] font-extrabold tracking-wider">
            {identity?.nft_address ? truncateAddr(identity.nft_address) : '0xIdentity...B123'}
          </span>
        </div>
      </div>

      {/* ── NEURAL SUB-NETWORKS ─────────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
          NEURAL SUB-NETWORKS
        </div>
        <div className="space-y-2">
          {[
            { name: 'MarketFlow_AI_01', active: true },
            { name: 'Volume_Sentry_03', active: true },
          ].map((sub, i) => (
            <div key={i} className="flex items-center justify-between text-[9px] font-mono">
              <span className="text-[var(--text-primary)]">{sub.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)] mr-1">Status</span>
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_4px_var(--green)]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_4px_var(--green)]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] shadow-[0_0_4px_var(--green)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PORTFOLIO DISTRIBUTION ──────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
          PORTFOLIO DISTRIBUTION
        </div>
        <div className="flex items-center justify-around">
          <PortfolioCircle token="MNT" pct={48} color="var(--cyan)" />
          <PortfolioCircle token="ETH" pct={32} color="var(--purple)" />
          <PortfolioCircle token="USD" pct={20} color="#F59E0B" centerText="$" />
        </div>
      </div>

      {/* ── RISK ASSESSMENT MATRIX ──────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
          RISK ASSESSMENT MATRIX
        </div>
        <div className="space-y-1">
          <RiskMatrixRow label="MNT" score={9} />
          <RiskMatrixRow label="ETH" score={3} />
          <RiskMatrixRow label="SIGN" score={5} />
          <RiskMatrixRow label="LOG" score={2} />
        </div>
      </div>

      {/* ── CURRENT AI POSITION ─────────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
          CURRENT AI POSITION
        </div>
        
        {/* Table header */}
        <div className="grid grid-cols-[1.2fr_1fr_1fr] text-[8px] font-mono text-[var(--text-muted)] font-bold pb-1.5 border-b border-[rgba(255,255,255,0.03)] mb-2">
          <span>WALLET ADDRESS</span>
          <span>OPEN TRADES</span>
          <span className="text-right">STATUS</span>
        </div>

        {/* Table rows */}
        <div className="space-y-2">
          {[
            { addr: '0xWhale...1234538', pair: 'MNT/USDT', pct: 95 },
            { addr: '0xWhale...1234537', pair: 'MNT/USDT', pct: 55 }
          ].map((pos, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_1fr_1fr] items-center text-[9px] font-mono">
              <span className="text-[var(--text-primary)]">{pos.addr}</span>
              <span className="text-[var(--text-muted)]">{pos.pair}</span>
              <div className="flex flex-col items-end">
                <span className="text-[var(--green)] font-bold mb-0.5">{pos.pct}%</span>
                <div className="w-12 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--green)] rounded-full" style={{ width: `${pos.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTIVE WHALE TARGETS ────────────────────────────────────── */}
      <div className="p-3 shrink-0">
        <div className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--text-muted)] mb-3">
          ACTIVE WHALE TARGETS
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] text-[8px] font-mono text-[var(--text-muted)] font-bold pb-1.5 border-b border-[rgba(255,255,255,0.03)] mb-2">
          <span>ADDRESS</span>
          <span>TRANSFER</span>
          <span>TOKEN</span>
          <span className="text-right">PRIORITY</span>
        </div>

        {/* Table rows */}
        <div className="space-y-2">
          {[
            { addr: '0xWhale...12344NN', amount: '+6 GRT', token: 'MNT', p: '▲ 9', cls: 'badge-priority-high' },
            { addr: '0xWhale...1234022', amount: '+1 GRT', token: 'AGNI', p: '▼ 5', cls: 'badge-priority-medium' },
            { addr: '0xWhale...1234028', amount: '+5 BRT', token: 'AGNI', p: '▼ 3', cls: 'badge-priority-low' }
          ].map((target, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] items-center text-[9px] font-mono">
              <span className="text-[var(--text-primary)]">{target.addr}</span>
              <span className="text-[var(--green)] font-bold">{target.amount}</span>
              <span className="text-[var(--text-muted)]">{target.token}</span>
              <div className="flex justify-end">
                <span className={`text-[8.5px] font-black px-2 py-0.5 rounded ${target.cls} flex items-center justify-center min-w-9`}>
                  {target.p}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
