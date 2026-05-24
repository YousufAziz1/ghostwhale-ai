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
      className="flex items-center gap-3 px-4 py-1.5 rounded-lg bg-[rgba(8,11,26,0.65)] border border-[rgba(0,245,255,0.15)] shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_4px_12px_rgba(0,0,0,0.3)] hover:border-[rgba(0,245,255,0.4)] hover:shadow-[0_0_15px_rgba(0,245,255,0.12)] transition-all duration-200"
      style={{ minWidth: 180 }}
    >
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--text-muted)] select-none">
            {t.symbol}
          </span>
          <span className="font-mono text-[10px] font-bold select-none" style={{ color }}>
            {isUp ? '▲' : '▼'} {Math.abs(t.change).toFixed(1)}%
          </span>
        </div>
        <span className="font-orbitron text-[12px] font-black text-white leading-tight select-none">
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
      className="flex items-center h-full w-full overflow-hidden animate-in"
    >
      {/* Left Logo branding aligned to 284px width */}
      <div
        className="flex items-center gap-3 shrink-0 h-full w-auto lg:w-[284px]"
        style={{ borderRight: '1px solid var(--border)', paddingLeft: 12 }}
      >
        <span className="text-2xl drop-shadow-[0_0_10px_var(--cyan)] select-none">🐋</span>
        <span className="font-orbitron text-[16px] font-black tracking-widest text-gradient select-none">
          GHOSTWHALE
        </span>
      </div>

      {/* Tickers list */}
      <div className="hidden md:flex flex-1 items-center gap-3 px-6 overflow-x-auto overflow-y-hidden py-1 feed-scroll scrollbar-none">
        {tickers.map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>
    </div>
  )
}
