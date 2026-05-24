import { useEffect, useState } from 'react'

interface Ticker {
  symbol: string; price: number; change: number; spark: number[]
}

const SEED: Ticker[] = [
  { symbol: 'BTC/USDT',  price: 68240,  change:  3.14, spark: [62,65,63,68,64,67,68] },
  { symbol: 'ETH/USDT',  price: 3812,   change: -1.20, spark: [38,37,39,38,36,37,38] },
  { symbol: 'MNT/USDT',  price: 1.08,    change:  5.80, spark: [0.95,1.0,0.98,1.05,1.02,1.06,1.08] },
  { symbol: 'AGNI/USDT', price: 0.0412,  change:  5.20, spark: [0.036,0.038,0.04,0.039,0.041,0.042,0.041] },
  { symbol: 'MOE/USDT',  price: 0.00823, change: -1.30, spark: [0.009,0.0085,0.0082,0.0083,0.0081,0.0082,0.0082] },
]

const TICKER_CONFIGS: Record<string, { sparkColor: string; textColor: string; glowColor: string }> = {
  'BTC/USDT': { sparkColor: '#00F5FF', textColor: 'var(--green)', glowColor: 'rgba(0,245,255,0.35)' },
  'ETH/USDT': { sparkColor: '#D946EF', textColor: 'var(--red)', glowColor: 'rgba(217,70,239,0.35)' },
  'MNT/USDT': { sparkColor: 'var(--green)', textColor: 'var(--green)', glowColor: 'rgba(16,185,129,0.35)' },
  'AGNI/USDT': { sparkColor: '#8B5CF6', textColor: '#8B5CF6', glowColor: 'rgba(139,92,246,0.35)' },
  'MOE/USDT': { sparkColor: '#00F5FF', textColor: 'var(--red)', glowColor: 'rgba(0,245,255,0.35)' },
}

function SparklineArea({ data, color, glowColor }: { data: number[]; color: string; glowColor: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 110, h = 20

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return { x, y }
  })

  // Generates cubic bezier smooth path
  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const cpX1 = p0.x + (p1.x - p0.x) / 2
    const cpY1 = p0.y
    const cpX2 = p1.x - (p1.x - p0.x) / 2
    const cpY2 = p1.y
    linePath += ` C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
  }

  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`
  const gradId = `grad-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TickerItem({ t }: { t: Ticker }) {
  const config = TICKER_CONFIGS[t.symbol] || {
    sparkColor: t.change >= 0 ? 'var(--green)' : 'var(--red)',
    textColor: t.change >= 0 ? 'var(--green)' : 'var(--red)',
    glowColor: t.change >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,59,92,0.3)'
  }

  const isUp = t.change >= 0

  return (
    <div className="flex flex-col justify-between h-full px-4 py-1.5 flex-1 min-w-[120px] border-r border-[rgba(0,245,255,0.12)] last:border-r-0 relative overflow-hidden group hover:bg-[rgba(0,245,255,0.02)] transition-colors duration-200">
      {/* Top Symbol & Change Row */}
      <div className="flex items-center justify-between gap-2 z-10">
        <span className="font-mono text-[9px] font-bold tracking-wider text-[#A0AEC0] select-none uppercase">
          {t.symbol}
        </span>
        <span className="font-mono text-[9px] font-black select-none tracking-wide" style={{ color: config.textColor }}>
          {isUp ? '+' : ''}{t.change.toFixed(1)}%
        </span>
      </div>

      {/* Sparkline area filling bottom */}
      <div className="h-5 w-full mt-1.5 z-10 flex items-end">
        <SparklineArea data={t.spark} color={config.sparkColor} glowColor={config.glowColor} />
      </div>
    </div>
  )
}

const WhaleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_6px_var(--cyan)]">
    <circle cx="12" cy="12" r="10" stroke="rgba(0, 245, 255, 0.3)" />
    <path d="M17 12c-.5-1-1.5-2-3-2H9.5C8 10 7 11 6.5 12c.5 1.5 2 2 3.5 2H13c1.5 0 2.5-.5 3-1.5s.5-.5 1-.5z" />
    <path d="M6.5 12c-1-.5-2-1.5-2.5-1.5M6.5 12c-1 .5-2 1.5-2.5 1.5" />
    <circle cx="14.5" cy="11.5" r="0.5" fill="var(--cyan)" />
  </svg>
)

export default function LiveTicker({ isConnected, latestBlock }: { isConnected: boolean; latestBlock?: number }) {
  const [tickers, setTickers] = useState<Ticker[]>(SEED)

  useEffect(() => {
    const iv = setInterval(() => {
      setTickers(prev => prev.map(t => {
        const delta = (Math.random() - 0.498) * t.price * 0.001
        const newPrice = t.price + delta
        return {
          ...t,
          price: newPrice,
          change: t.change + (Math.random() - 0.5) * 0.04,
          spark: [...t.spark.slice(1), newPrice],
        }
      }))
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex items-center gap-3 h-full w-full overflow-hidden animate-in">
      {/* Logo Card */}
      <div className="flex items-center gap-3 shrink-0 px-4 h-11 border border-[rgba(0,245,255,0.18)] bg-[rgba(8,11,26,0.4)] rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_0_15px_rgba(0,245,255,0.04)]">
        <WhaleIcon />
        <span className="font-orbitron text-[15.5px] font-black tracking-widest text-[var(--cyan)] drop-shadow-[0_0_6px_var(--cyan)] select-none">
          GHOSTWHALE
        </span>
      </div>

      {/* Tickers container */}
      <div className="hidden md:flex flex-1 items-center border border-[rgba(0,245,255,0.18)] bg-[rgba(8,11,26,0.4)] rounded-lg h-11 overflow-hidden select-none">
        {tickers.map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>
    </div>
  )
}

