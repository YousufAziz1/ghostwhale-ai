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

  const doubled = [...tickers, ...tickers]

  return (
    <div
      className="flex items-center h-10 w-full overflow-hidden"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Left: Logo + status */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 h-full"
        style={{ borderRight: '1px solid var(--border)', minWidth: 200 }}
      >
        <span className="font-orbitron text-[11px] font-bold tracking-wider text-gradient">
          GHOSTWHALE
        </span>
        <div className="flex items-center gap-1.5">
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          <span className="font-mono text-[8px]" style={{ color: 'var(--red)' }}>LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isConnected ? 'var(--green)' : 'var(--text-muted)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono text-[8px]" style={{ color: 'var(--text-muted)' }}>
            Mantle
          </span>
        </div>
      </div>

      {/* Tokens Row */}
      <div className="flex-1 flex items-center gap-4 px-4 overflow-hidden">
        {SEED.slice(0, 5).map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>

      {/* Right: block + time */}
      <div
        className="flex items-center gap-4 px-4 shrink-0 h-full"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        {latestBlock && (
          <span className="font-mono text-[9px]" style={{ color: 'var(--cyan)' }}>
            #{latestBlock.toLocaleString()}
          </span>
        )}
        <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
          {time.toUTCString().slice(17, 25)} UTC
        </span>
      </div>
    </div>
  )
}
