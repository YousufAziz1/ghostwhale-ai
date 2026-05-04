import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceDot, ResponsiveContainer,
} from 'recharts'
import type { PnLPoint } from '@/types'
import { formatUSD } from '@/lib/api'

interface PnLChartProps {
  data: PnLPoint[]
  loading: boolean
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: PnLPoint }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const pnl = d.pnl_usd
  const cum  = d.cumulative_pnl_usd

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-3 font-mono text-xs shadow-xl">
      <p className="text-[var(--text-muted)] mb-1">
        {new Date(d.timestamp).toLocaleString()}
      </p>
      <p className={`font-bold ${pnl >= 0 ? 'text-[var(--accent)]' : 'text-[var(--accent-red)]'}`}>
        Trade: {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
      </p>
      <p className={`${cum >= 0 ? 'text-[var(--accent-2)]' : 'text-[var(--accent-red)]'}`}>
        Cumulative: {cum >= 0 ? '+' : ''}{formatUSD(cum)}
      </p>
      <p className="text-[var(--text-faint)] mt-1">
        {d.direction} {d.token}
      </p>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
      <span className="text-3xl">📈</span>
      <p className="font-mono text-xs">No trades settled yet</p>
      <p className="font-mono text-[10px] text-[var(--text-faint)]">
        P&L chart will appear after first exit
      </p>
    </div>
  )
}

export default function PnLChart({ data, loading }: PnLChartProps) {
  const isPositive = data.length === 0 || (data[data.length - 1]?.cumulative_pnl_usd ?? 0) >= 0
  const strokeColor = isPositive ? 'var(--accent)' : 'var(--accent-red)'
  const fillId      = isPositive ? 'pnl-gradient-green' : 'pnl-gradient-red'

  const totalPnL = data.length > 0 ? data[data.length - 1].cumulative_pnl_usd : 0

  return (
    <section id="pnl-chart" className="card flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
          Mock P&L
        </span>
        {data.length > 0 && (
          <span className={`font-mono font-bold text-sm ${totalPnL >= 0 ? 'text-[var(--accent)]' : 'text-[var(--accent-red)]'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatUSD(totalPnL)}
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 144 }}>
        {loading && data.length === 0 ? (
          <div className="h-full bg-[var(--border-subtle)] animate-pulse rounded-lg" />
        ) : data.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="pnl-gradient-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pnl-gradient-red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent-red)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="timestamp"
                hide
              />
              <YAxis
                tickFormatter={v => `$${v >= 0 ? '+' : ''}${Math.round(v)}`}
                tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'var(--text-muted)' }}
                width={56}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative_pnl_usd"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${fillId})`}
                dot={false}
                activeDot={{ r: 4, fill: strokeColor, stroke: 'var(--bg-base)', strokeWidth: 2 }}
              />
              {/* Mark individual trade dots */}
              {data.map((d, i) => (
                <ReferenceDot
                  key={i}
                  x={d.timestamp}
                  y={d.cumulative_pnl_usd}
                  r={3}
                  fill={d.pnl_usd >= 0 ? 'var(--accent)' : 'var(--accent-red)'}
                  stroke="var(--bg-base)"
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex justify-between font-mono text-[10px] text-[var(--text-faint)]">
        <span>Settled: {data.length} trades</span>
        <span>MOCK MODE</span>
      </div>
    </section>
  )
}
