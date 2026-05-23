import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Ticker {
  symbol: string; price: number; change: number; spark: number[]
}

const SEED: Ticker[] = [
  { symbol: 'BTC',  price: 68_240,  change:  2.14, spark: [62,65,63,68,64,67,68] },
  { symbol: 'ETH',  price: 3_812,   change: -0.82, spark: [38,37,39,38,36,37,38] },
  { symbol: 'MNT',  price: 1.08,    change:  3.40, spark: [0.95,1.0,0.98,1.05,1.02,1.06,1.08] },
  { symbol: 'mETH', price: 3_814,   change: -0.78, spark: [38,37,39,38,36,37,38] },
  { symbol: 'AGNI', price: 0.0412,  change:  5.20, spark: [0.036,0.038,0.04,0.039,0.041,0.042,0.041] },
  { symbol: 'MOE',  price: 0.00823, change: -1.30, spark: [0.009,0.0085,0.0082,0.0083,0.0081,0.0082,0.0082] },
  { symbol: 'USDT', price: 1.0001,  change:  0.01, spark: [1,1,1,1,1,1,1] },
  { symbol: 'USDY', price: 1.054,   change:  0.12, spark: [1.05,1.051,1.052,1.053,1.052,1.053,1.054] },
]

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 36, h = 16
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TickerItem({ t }: { t: Ticker }) {
  const isUp = t.change >= 0
  const color = isUp ? 'var(--green)' : 'var(--red)'
  return (
    <div className="flex items-center gap-3 px-5 shrink-0"
      style={{ borderRight: '1px solid var(--border)' }}>
      <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {t.symbol}
      </span>
      <span className="font-orbitron text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
        ${t.price.toLocaleString('en-US', { minimumFractionDigits: t.price < 1 ? 4 : 2, maximumFractionDigits: t.price < 1 ? 4 : 2 })}
      </span>
      <span className="font-mono text-[9px] font-bold" style={{ color }}>
        {isUp ? '▲' : '▼'} {Math.abs(t.change).toFixed(2)}%
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

export default function LiveTicker({ isConnected, latestBlock }: { isConnected: boolean; latestBlock?: number }) {
  const [tickers, setTickers] = useState<Ticker[]>(SEED)
  const [time, setTime] = useState(new Date())

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
      setTime(new Date())
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
      <div className="hidden md:flex flex-1 items-center gap-0 overflow-hidden h-full">
        {tickers.slice(0, 5).map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>

      {/* Right: block + time */}
      <div
        className="hidden sm:flex items-center gap-4 px-4 shrink-0 h-full font-mono text-[9px]"
        style={{ borderLeft: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        {latestBlock && (
          <span style={{ color: 'var(--cyan)' }} className="font-bold">
            #{latestBlock.toLocaleString()}
          </span>
        )}
        <span>
          {time.toUTCString().slice(17, 25)} UTC
        </span>
      </div>
    </div>
  )
}
