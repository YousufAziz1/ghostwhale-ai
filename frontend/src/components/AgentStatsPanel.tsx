import { motion } from 'framer-motion'
import type { AgentIdentity, AgentStats } from '@/types'
import { Shield, Zap, Activity, TrendingUp, Target, Brain, Server } from 'lucide-react'
import { formatUSD, truncateAddr } from '@/lib/api'

interface AgentStatsProps {
  identity: AgentIdentity | null
  stats: AgentStats | null
  loading: boolean
  statusPhrase: string
}

export default function AgentStatsPanel({ identity, stats, loading, statusPhrase }: AgentStatsProps) {
  const repScore = identity?.reputation_score ?? stats?.reputation_score ?? 840
  const winRate  = identity?.win_rate_pct ?? stats?.win_rate_pct ?? 68.9
  const totalPnL = identity?.total_pnl_usd ?? stats?.total_pnl_usd ?? 12450.45
  const signals  = identity?.total_signals ?? stats?.total_signals ?? 142
  const settled  = identity?.settled_trades ?? stats?.settled_trades ?? 87

  // Helper for generating Risk Matrix blocks
  const renderRiskRow = (label: string, activeCount: number) => {
    return (
      <div className="flex items-center justify-between gap-2 py-1">
        <span className="font-mono text-[9px] text-[var(--text-muted)] w-8 shrink-0">{label}</span>
        <div className="flex gap-1 flex-1 justify-start">
          {Array.from({ length: 10 }).map((_, i) => {
            const isActive = i < activeCount
            let bg = 'rgba(255,255,255,0.03)'
            let border = '1px solid rgba(255,255,255,0.05)'
            let glow = 'none'

            if (isActive) {
              if (i < 6) {
                bg = 'rgba(16,185,129,0.35)'
                border = '1px solid var(--green)'
                glow = '0 0 6px var(--green)'
              } else if (i < 9) {
                bg = 'rgba(245,158,11,0.35)'
                border = '1px solid var(--amber)'
                glow = '0 0 6px var(--amber)'
              } else {
                bg = 'rgba(255,59,92,0.35)'
                border = '1px solid var(--red)'
                glow = '0 0 6px var(--red)'
              }
            }

            return (
              <div
                key={i}
                className="w-3.5 h-2.5 rounded-sm"
                style={{
                  background: bg,
                  border,
                  boxShadow: glow,
                  transition: 'all 0.3s ease'
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-0 pr-1 select-none">
      {/* ── Diagnostics Header ─────────────────────────────────────────── */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,255,0.15) 0%, rgba(124,58,237,0.15) 100%)',
              border: '1px solid rgba(0,245,255,0.3)',
              boxShadow: '0 0 15px rgba(0,245,255,0.1)',
            }}
            animate={{ boxShadow: ['0 0 10px rgba(0,245,255,0.1)', '0 0 20px rgba(0,245,255,0.2)', '0 0 10px rgba(0,245,255,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🐋
          </motion.div>
          <div>
            <div className="font-orbitron font-black text-[15px] tracking-wide text-gradient">DIAGNOSTICS PANEL</div>
            <div className="font-orbitron text-[10.5px] font-bold tracking-widest text-[var(--text-muted)]">
              SYSTEM VITALS · RUNNING
            </div>
          </div>
        </div>

        {/* Status Pill + Rep Score */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div
            className="rounded-lg px-3 py-2 flex flex-col justify-between"
            style={{
              background: 'rgba(124,58,237,0.06)',
              border: '1px solid rgba(124,58,237,0.25)',
              boxShadow: '0 0 10px rgba(124,58,237,0.05)'
            }}
          >
            <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)] tracking-wider block">AI AGENT STATUS</span>
            <span className="font-orbitron text-[12px] font-black text-[var(--purple)] mt-0.5" style={{ textShadow: '0 0 8px rgba(124,58,237,0.4)' }}>
              HUNTING (ACTIVE)
            </span>
          </div>

          <div
            className="rounded-lg px-3 py-2 flex flex-col justify-between"
            style={{
              background: 'rgba(0,245,255,0.06)',
              border: '1px solid rgba(0,245,255,0.25)',
              boxShadow: '0 0 10px rgba(0,245,255,0.05)'
            }}
          >
            <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)] tracking-wider block">REP SCORE</span>
            <span className="font-orbitron text-[13px] font-black text-[var(--cyan)] mt-0.5" style={{ textShadow: '0 0 8px rgba(0,245,255,0.4)' }}>
              {Math.round(repScore / 10)}/100
            </span>
          </div>
        </div>

        {/* Live log feed banner */}
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: 'rgba(0,245,255,0.02)',
            border: '1px solid rgba(0,245,255,0.06)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="live-dot" style={{ width: 6, height: 6 }} />
            <span className="font-mono text-[9.5px] font-bold" style={{ color: 'rgba(0,245,255,0.6)' }}>MONITORING FEED</span>
          </div>
          <motion.p
            key={statusPhrase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-[11px] font-semibold truncate"
            style={{ color: 'var(--cyan)' }}
          >
            {statusPhrase}
          </motion.p>
        </div>
      </div>

      {/* ── Core Statistics Grid ──────────────────────────────────────── */}
      <div className="p-4 shrink-0 grid grid-cols-2 gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] flex flex-col">
          <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)]">WIN RATE</span>
          <span className="font-orbitron text-[14px] font-black text-[var(--purple)] mt-1">{winRate}%</span>
        </div>
        <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] flex flex-col">
          <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)]">TOTAL PNL</span>
          <span className="font-orbitron text-[14px] font-black text-[var(--green)] mt-1">+{formatUSD(totalPnL)}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] flex flex-col">
          <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)]">SIGNALS GENERATED</span>
          <span className="font-orbitron text-[14px] font-black text-white mt-1">{signals}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.03)] flex flex-col">
          <span className="font-mono text-[9.5px] font-bold text-[var(--text-muted)]">EXECUTED TRADES</span>
          <span className="font-orbitron text-[14px] font-black text-white mt-1">{settled}</span>
        </div>
      </div>

      {/* ERC-8004 Identity */}
      <div className="p-4 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-[var(--purple)]" />
          <span className="font-mono text-[11px] font-bold text-[var(--text-muted)] tracking-wider">ERC-8004 IDENTITY</span>
        </div>
        <span className="font-mono text-[12px] font-black text-[var(--purple)] bg-[var(--purple-dim)] px-2.5 py-0.5 rounded border border-[rgba(124,58,237,0.25)]">
          {identity?.nft_address ? truncateAddr(identity.nft_address) : '0xIdentity...B123'}
        </span>
      </div>

      {/* ── Neural Sub-Networks ────────────────────────────────────────── */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <Brain size={13} className="text-[var(--cyan)]" />
          <span className="font-orbitron text-[11.5px] font-black tracking-widest text-[var(--cyan)]">NEURAL SUB-NETWORKS</span>
        </div>
        <div className="space-y-1.5">
          {[
            { name: 'MarketFlow_AI_01', count: 3 },
            { name: 'Volume_Sentry_03', count: 3 },
          ].map((n, idx) => (
            <div key={idx} className="flex items-center justify-between py-1">
              <span className="font-mono text-[11.5px] font-bold text-[var(--text-primary)]">{n.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-[var(--text-muted)]">Status</span>
                <div className="flex gap-1.5">
                  {Array.from({ length: n.count }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[var(--green)]"
                      style={{ boxShadow: '0 0 6px var(--green)' }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Portfolio Distribution (Circles) ───────────────────────────── */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-orbitron text-[11.5px] font-black tracking-widest text-[var(--purple)] block mb-3">
          PORTFOLIO DISTRIBUTION
        </span>
        <div className="flex justify-around items-center py-1">
          {[
            { token: 'MNT', color: 'var(--cyan)' },
            { token: 'ETH', color: 'var(--purple)' },
            { token: '$', color: 'var(--amber)' },
          ].map((t, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className="w-13 h-13 rounded-full flex items-center justify-center font-orbitron text-[12px] font-black text-white relative"
                style={{
                  background: 'var(--bg-elevated)',
                  border: `3px solid ${t.color}`,
                  boxShadow: `0 0 15px ${t.color}25`
                }}
              >
                <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.05)' }} />
                {t.token}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Risk Assessment Heatmap ────────────────────────────────────── */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-orbitron text-[11.5px] font-black tracking-widest text-[var(--red)] block mb-2.5">
          RISK ASSESSMENT MATRIX
        </span>
        <div className="space-y-1">
          {renderRiskRow('MKT', 8)}
          {renderRiskRow('ETH', 6)}
          {renderRiskRow('SIG', 9)}
          {renderRiskRow('LIQ', 10)}
        </div>
      </div>

      {/* ── Current AI Position ────────────────────────────────────────── */}
      <div className="p-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 mb-2.5">
          <Activity size={13} className="text-[var(--green)]" />
          <span className="font-orbitron text-[11.5px] font-black tracking-widest text-[var(--green)]">CURRENT AI POSITION</span>
        </div>
        <div className="w-full overflow-hidden rounded-lg border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase">Wallet Address</th>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase">Open Trades</th>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="font-mono text-[11px] p-2.5 text-white font-medium">0xWhale...1234538</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--cyan)]">mETH/USDC</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--green)] text-right font-black">95%</td>
              </tr>
              <tr>
                <td className="font-mono text-[11px] p-2.5 text-white font-medium">0xWhale...1234537</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--cyan)]">mETH/USDC</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--amber)] text-right font-black">55%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Active Whale Targets ───────────────────────────────────────── */}
      <div className="p-4 shrink-0 mb-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Target size={13} className="text-[var(--red)]" />
          <span className="font-orbitron text-[11.5px] font-black tracking-widest text-[var(--red)]">ACTIVE WHALE TARGETS</span>
        </div>
        <div className="w-full overflow-hidden rounded-lg border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase">Address</th>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase">Transfer</th>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase">Token</th>
                <th className="font-mono text-[9px] font-bold text-[var(--text-muted)] p-2.5 uppercase text-right">Priority</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="font-mono text-[11px] p-2.5 text-white font-medium">0xWhale...1234088</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--cyan)] font-semibold">+6 GRT</td>
                <td className="font-mono text-[11px] p-2.5 text-white">MNT</td>
                <td className="p-2.5 text-right">
                  <span className="font-mono text-[10px] font-black bg-[rgba(255,59,92,0.15)] text-[var(--red)] border border-[rgba(255,59,92,0.3)] px-2 py-0.5 rounded">
                    HIGH
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td className="font-mono text-[11px] p-2.5 text-white font-medium">0xWhale...1234022</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--cyan)] font-semibold">+1 GRT</td>
                <td className="font-mono text-[11px] p-2.5 text-white">AGNI</td>
                <td className="p-2.5 text-right">
                  <span className="font-mono text-[10px] font-black bg-[rgba(245,158,11,0.15)] text-[var(--amber)] border border-[rgba(245,158,11,0.3)] px-2 py-0.5 rounded">
                    MED
                  </span>
                </td>
              </tr>
              <tr>
                <td className="font-mono text-[11px] p-2.5 text-white font-medium">0xWhale...1234028</td>
                <td className="font-mono text-[11px] p-2.5 text-[var(--cyan)] font-semibold">+5 GRT</td>
                <td className="font-mono text-[11px] p-2.5 text-white">AGNI</td>
                <td className="p-2.5 text-right">
                  <span className="font-mono text-[10px] font-black bg-[rgba(59,130,246,0.15)] text-[var(--blue)] border border-[rgba(59,130,246,0.3)] px-2 py-0.5 rounded">
                    LOW
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
