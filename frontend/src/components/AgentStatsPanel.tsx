import { motion } from 'framer-motion'
import type { AgentIdentity, AgentStats } from '@/types'
import { Shield, Zap, Activity, TrendingUp, Target } from 'lucide-react'
import { formatUSD } from '@/lib/api'

interface AgentStatsProps {
  identity: AgentIdentity | null
  stats: AgentStats | null
  loading: boolean
  statusPhrase: string
}

function GlowGauge({ value, max, color, label, size = 80 }: {
  value: number; max: number; color: string; label: string; size?: number
}) {
  const pct = Math.min(value / max, 1)
  const R = size / 2 - 8
  const circ = 2 * Math.PI * R * 0.75 // 270 degree arc
  const offset = circ * (1 - pct)
  const stroke = size < 80 ? 3 : 4

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size * 0.75 }}>
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
            strokeDasharray={`${circ} ${2 * Math.PI * R}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* Fill */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={R}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${circ} ${2 * Math.PI * R}`}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        {/* Value text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: size * 0.12 }}
        >
          <span className="font-orbitron font-bold" style={{ color, fontSize: size < 80 ? 11 : 14 }}>
            {Math.round(value * (max <= 1 ? 100 : 1))}
            {max <= 1 ? '%' : ''}
          </span>
        </div>
      </div>
      <span className="font-mono text-[8px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

function StatRow({ icon: Icon, label, value, color = 'var(--text-primary)' }: {
  icon: React.ElementType; label: string; value: string; color?: string
}) {
  return (
    <div className="flex items-center justify-between py-2"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <Icon size={10} color="var(--text-muted)" />
        <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span className="font-mono text-[10px] font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

export default function AgentStatsPanel({ identity, stats, loading, statusPhrase }: AgentStatsProps) {
  const repScore = identity?.reputation_score ?? stats?.reputation_score ?? 620
  const winRate  = identity?.win_rate_pct ?? stats?.win_rate_pct ?? 67.4
  const totalPnL = identity?.total_pnl_usd ?? stats?.total_pnl_usd ?? 0
  const signals  = identity?.total_signals ?? stats?.total_signals ?? 0
  const settled  = identity?.settled_trades ?? stats?.settled_trades ?? 0

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-0">
      {/* Agent Header */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(124,58,237,0.15) 100%)',
              border: '1px solid rgba(0,245,255,0.3)',
              boxShadow: '0 0 20px rgba(0,245,255,0.1)',
            }}
            animate={{ boxShadow: ['0 0 15px rgba(0,245,255,0.1)', '0 0 30px rgba(0,245,255,0.25)', '0 0 15px rgba(0,245,255,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🐋
          </motion.div>
          <div>
            <div className="font-orbitron font-bold text-sm text-gradient">GHOSTWHALE</div>
            <div className="font-orbitron text-[8px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
              AI AGENT · ERC-8004
            </div>
          </div>
        </div>

        {/* Status phrase */}
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: 'rgba(0,245,255,0.04)',
            border: '1px solid rgba(0,245,255,0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="live-dot" style={{ width: 6, height: 6 }} />
            <span className="font-mono text-[8px]" style={{ color: 'rgba(0,245,255,0.6)' }}>STATUS</span>
          </div>
          <motion.p
            key={statusPhrase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[9px] leading-relaxed"
            style={{ color: 'var(--cyan)' }}
          >
            {statusPhrase}
          </motion.p>
        </div>
      </div>

      {/* Gauges */}
      <div className="p-4 grid grid-cols-2 gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <GlowGauge value={repScore} max={1000} color="var(--cyan)"   label="REP SCORE" size={84} />
        <GlowGauge value={winRate}  max={100}  color="var(--green)"  label="WIN RATE"  size={84} />
      </div>

      {/* Stats list */}
      <div className="p-4 shrink-0">
        <StatRow icon={TrendingUp} label="TOTAL PNL"   value={formatUSD(totalPnL)} color={totalPnL >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatRow icon={Zap}        label="SIGNALS"     value={signals.toString()} color="var(--cyan)" />
        <StatRow icon={Activity}   label="TRADES"      value={settled.toString()} />
        <StatRow icon={Target}     label="NETWORK"     value="Mantle" color="var(--purple)" />
        <StatRow icon={Shield}     label="STANDARD"    value={identity?.standard ?? 'ERC-8004'} color="var(--cyan)" />
      </div>

    {/* ERC-8004 Identity badge */}
      <div className="mx-4 mb-5 rounded-xl overflow-hidden shrink-0"
        style={{ border: '1px solid rgba(124,58,237,0.3)' }}>
        <div className="px-3 py-2"
          style={{ background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
          <span className="font-orbitron text-[8px] font-bold tracking-widest" style={{ color: 'var(--purple)' }}>
            ERC-8004 ON-CHAIN IDENTITY
          </span>
        </div>
        <div className="p-3 space-y-1.5">
          {[
            { k: 'REPUTATION', v: `${repScore}/1000` },
            { k: 'TRUST SCORE', v: `${Math.round(winRate)}%` },
            { k: 'CHAIN', v: 'Mantle Mainnet' },
            { k: 'TOKEN ID', v: `#${identity?.token_id ?? '001'}` },
          ].map(({ k, v }) => (
            <div key={k} className="flex items-center justify-between">
              <span className="font-mono text-[8px]" style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span className="font-mono text-[9px] font-bold" style={{ color: 'rgba(124,58,237,0.9)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sub-Networks */}
      <div className="mx-4 mb-8 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <motion.div className="w-2 h-2 bg-[var(--cyan)] rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: 'var(--cyan)' }}>
            NEURAL SUB-NETWORKS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'RPC NODE', ping: '12ms' },
            { label: 'NLP CORE', ping: '8ms' },
            { label: 'MEMPOOL', ping: '24ms' },
            { label: 'EXECUTION', ping: '15ms' }
          ].map((n, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{n.label}</span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--green)' }}>{n.ping}</span>
              </div>
              <div className="w-full bg-[rgba(0,245,255,0.1)] h-1 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[var(--cyan)]" 
                  initial={{ width: '40%' }}
                  animate={{ width: ['40%', '80%', '50%', '90%', '40%'] }}
                  transition={{ duration: 3 + i, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Distribution */}
      <div className="mx-4 mb-8 shrink-0">
         <div className="flex items-center gap-2 mb-4">
          <span className="font-orbitron text-[10px] font-bold tracking-widest" style={{ color: 'var(--purple)' }}>
            PORTFOLIO DISTRIBUTION
          </span>
        </div>
        <div className="space-y-4">
           {[
             { token: 'mETH', pct: 45, color: 'var(--cyan)' },
             { token: 'USDC', pct: 30, color: 'var(--green)' },
             { token: 'WMNT', pct: 25, color: 'var(--purple)' }
           ].map(t => (
             <div key={t.token}>
                <div className="flex justify-between text-[11px] font-mono mb-2">
                   <span style={{ color: 'var(--text-primary)' }}>{t.token}</span>
                   <span style={{ color: t.color }}>{t.pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: t.color, width: `${t.pct}%` }} />
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mx-4 mb-8 shrink-0">
         <div className="flex items-center gap-2 mb-4">
          <span className="font-orbitron text-[10px] font-bold tracking-widest text-[var(--red)]">
            RISK ASSESSMENT MATRIX
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,59,92,0.05)', border: '1px solid rgba(255,59,92,0.1)' }}>
            <div className="font-mono text-[9px] text-[var(--text-muted)] mb-1.5">MARKET VOLATILITY</div>
            <div className="font-mono text-[11px] font-bold text-[var(--red)]">ELEVATED (84%)</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <div className="font-mono text-[9px] text-[var(--text-muted)] mb-1.5">SMART CONTRACT</div>
            <div className="font-mono text-[11px] font-bold text-[var(--green)]">MINIMAL (12%)</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <div className="font-mono text-[9px] text-[var(--text-muted)] mb-1.5">LIQUIDITY DEPTH</div>
            <div className="font-mono text-[11px] font-bold text-[var(--green)]">OPTIMAL (94%)</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,204,21,0.05)', border: '1px solid rgba(255,204,21,0.1)' }}>
            <div className="font-mono text-[9px] text-[var(--text-muted)] mb-1.5">NETWORK CONGESTION</div>
            <div className="font-mono text-[11px] font-bold text-[var(--warning)]">MODERATE (45%)</div>
          </div>
        </div>
      </div>

      {/* System Compute */}
      <div className="mx-4 mb-6 shrink-0">
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
            <span className="font-orbitron text-[10px] font-bold tracking-widest text-[var(--text-muted)]">
              COMPUTE RESOURCES
            </span>
           </div>
           <span className="font-mono text-[10px] text-[var(--cyan)] animate-pulse">SYNCED</span>
        </div>
        <div className="space-y-4">
           <div>
             <div className="flex justify-between items-center text-[11px] font-mono mb-2">
                <span className="text-[var(--text-muted)]">GPU ALLOCATION</span>
                <span className="text-[var(--text-primary)]">94%</span>
             </div>
             <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
               <div className="h-full bg-[var(--cyan)] w-[94%]" />
             </div>
           </div>
           <div>
             <div className="flex justify-between items-center text-[11px] font-mono mb-2">
                <span className="text-[var(--text-muted)]">MEMORY BUFFER</span>
                <span className="text-[var(--text-primary)]">64%</span>
             </div>
             <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
               <div className="h-full bg-[var(--purple)] w-[64%]" />
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}
