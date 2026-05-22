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
  const w = 80, h = 24
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TickerItem({ t }: { t: Ticker }) {
  const isUp = t.change >= 0
  const color = isUp ? 'var(--green)' : 'var(--red)'
  return (
    <div className="flex flex-col justify-between h-full w-full px-4 py-2 shrink-0 border-r border-[rgba(255,255,255,0.05)] last:border-0">
      <div className="flex items-center justify-between w-full">
        <span className="font-orbitron text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {t.symbol}/USDT
        </span>
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {isUp ? '+' : ''}{t.change.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 flex items-end justify-center w-full">
        <MiniSparkline data={t.spark} color={color} />
      </div>
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
      className="flex items-center h-full w-full overflow-hidden justify-around px-2"
    >
      {SEED.slice(0, 5).map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
    </div>
  )
}
