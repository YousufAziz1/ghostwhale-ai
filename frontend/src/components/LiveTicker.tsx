import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Wifi } from 'lucide-react'

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

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 45, h = 18
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TickerItem({ t }: { t: Ticker }) {
  const isUp = t.change >= 0
  const color = isUp ? 'var(--green)' : 'var(--red)'
  return (
    <div 
      className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[rgba(15,21,48,0.5)] border border-[rgba(0,245,255,0.22)] shrink-0 shadow-[0_0_12px_rgba(0,245,255,0.05),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-[rgba(0,245,255,0.45)] hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all duration-200"
      style={{ minWidth: 165 }}
    >
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] font-bold tracking-wider text-[var(--text-muted)]">
            {t.symbol}
          </span>
          <span className="font-mono text-[10.5px] font-bold" style={{ color }}>
            {isUp ? '+' : ''}{t.change.toFixed(1)}%
          </span>
        </div>
        <span className="font-orbitron text-[13px] font-black text-white leading-tight">
          ${t.price.toLocaleString('en-US', { minimumFractionDigits: t.price < 1 ? 4 : 2, maximumFractionDigits: t.price < 1 ? 4 : 2 })}
        </span>
      </div>
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

  return (
    <div
      className="flex items-center h-16 w-full overflow-hidden animate-in"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Left Logo branding */}
      <div
        className="flex items-center gap-2.5 px-5 shrink-0 h-full"
        style={{ borderRight: '1px solid var(--border)', minWidth: 180 }}
      >
        <span className="text-2xl">🐋</span>
        <span className="font-orbitron text-[16px] font-black tracking-widest text-gradient">
          GHOSTWHALE
        </span>
      </div>

      {/* Tickers list */}
      <div className="flex flex-1 items-center gap-3 px-4 overflow-x-auto overflow-y-hidden py-1 feed-scroll scrollbar-none">
        {tickers.map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>
    </div>
  )
}
