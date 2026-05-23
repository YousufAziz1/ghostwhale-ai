import { useEffect, useState } from 'react'

interface Ticker {
  symbol: string; price: number; change: number; spark: number[]
}

const SEED: Ticker[] = [
  { symbol: 'BTC',  price: 68_240,  change:  3.10, spark: [62,65,63,68,64,67,68] },
  { symbol: 'ETH',  price: 3_812,   change: -1.20, spark: [38,37,39,38,36,37,38] },
  { symbol: 'MNT',  price: 1.08,    change:  5.80, spark: [0.95,1.0,0.98,1.05,1.02,1.06,1.08] },
  { symbol: 'AGNI', price: 0.0412,  change:  2.10, spark: [0.036,0.038,0.04,0.039,0.041,0.042,0.041] },
  { symbol: 'MOE',  price: 0.00823, change: -0.40, spark: [0.009,0.0085,0.0082,0.0083,0.0081,0.0082,0.0082] },
]

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 36, h = 14
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 2px ${color}88)` }} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TickerItem({ t }: { t: Ticker }) {
  const isUp = t.change >= 0
  const color = isUp ? 'var(--green)' : 'var(--red)'
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-[#080b1a]/50 border border-[rgba(0,245,255,0.12)] rounded-md select-none shrink-0"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)'
      }}
    >
      <span className="font-mono text-[9px] font-bold text-slate-400">
        {t.symbol}/USDT
      </span>
      <span className="font-mono text-[9px] font-medium text-slate-500">|</span>
      <span className="font-orbitron text-[9px] font-bold" style={{ color: 'var(--text-primary)' }}>
        ${t.price.toLocaleString('en-US', { minimumFractionDigits: t.price < 1 ? 4 : 2, maximumFractionDigits: t.price < 1 ? 4 : 2 })}
      </span>
      <span className="font-mono text-[9px] font-black" style={{ color }}>
        {isUp ? '+' : ''}{t.change.toFixed(1)}%
      </span>
      <MiniSparkline data={t.spark} color={color} />
    </div>
  )
}

const WhaleLogo = () => (
  <svg
    className="w-5 h-5 text-[var(--cyan)] mr-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ filter: 'drop-shadow(0 0 6px rgba(0, 245, 255, 0.6))' }}
  >
    <path d="M2 10c2-1 4-1.5 6-1.5 5 0 9 2.5 11 4.5h2c1 0 1.5-.5 1.5-1.5s-.8-2-2-2h-2c-2-2-5-3.5-8.5-3.5C5 6 3 7.5 2 10z" />
    <path d="M8 8.5C12 8.5 16 11 18 13c-2 2-6 4.5-10 4.5-4 0-6.5-2.5-6.5-5.5 0-2 1.5-3.5 3.5-3.5" />
    <path d="M10 13c-1.5.5-2 1.5-2.5 3 .5-.5 1.5-.5 2.5-.5" />
    <circle cx="5.5" cy="11.5" r="0.75" fill="currentColor" />
  </svg>
)

export default function LiveTicker({ isConnected, latestBlock }: { isConnected?: boolean; latestBlock?: number }) {
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
    <div
      className="flex items-center h-10 w-full overflow-hidden"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Left: Logo */}
      <div
        className="flex items-center gap-2.5 px-4 shrink-0 h-full"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <WhaleLogo />
        <span className="font-orbitron text-[12px] font-extrabold tracking-widest text-gradient">
          GHOSTWHALE
        </span>
      </div>

      {/* Tokens Row */}
      <div className="hidden md:flex flex-1 items-center gap-2 overflow-hidden h-full px-3">
        {tickers.slice(0, 5).map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>
    </div>
  )
}
