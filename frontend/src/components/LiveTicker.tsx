import { useEffect, useState } from 'react'

interface Ticker {
  symbol: string; price: number; change: number; spark: number[]
}

const SEED: Ticker[] = [
  { 
    symbol: 'BTC/USDT',  
    price: 76812,  
    change: 1.42, 
    spark: [76200, 76350, 76280, 76410, 76380, 76520, 76490, 76580, 76620, 76550, 76640, 76710, 76680, 76750, 76720, 76800, 76780, 76830, 76790, 76812] 
  },
  { 
    symbol: 'ETH/USDT',  
    price: 2120,   
    change: -0.85, 
    spark: [2145, 2138, 2142, 2135, 2130, 2128, 2132, 2125, 2118, 2122, 2115, 2110, 2114, 2108, 2105, 2112, 2118, 2115, 2122, 2120] 
  },
  { 
    symbol: 'MNT/USDT',  
    price: 0.66,    
    change: 2.34, 
    spark: [0.642, 0.645, 0.643, 0.648, 0.651, 0.649, 0.653, 0.656, 0.654, 0.658, 0.655, 0.660, 0.657, 0.662, 0.659, 0.663, 0.661, 0.658, 0.662, 0.660] 
  },
  { 
    symbol: 'AGNI/USDT', 
    price: 0.0021,  
    change: 4.50, 
    spark: [0.0019, 0.0019, 0.0020, 0.0019, 0.0020, 0.0020, 0.0020, 0.0021, 0.0020, 0.0021, 0.0021, 0.0020, 0.0021, 0.0021, 0.0021, 0.0021, 0.0022, 0.0021, 0.0021, 0.0021] 
  },
  { 
    symbol: 'MOE/USDT',  
    price: 0.0098, 
    change: -1.80, 
    spark: [0.0102, 0.0101, 0.0100, 0.0101, 0.0099, 0.0100, 0.0098, 0.0099, 0.0097, 0.0098, 0.0096, 0.0097, 0.0098, 0.0097, 0.0099, 0.0098, 0.0097, 0.0098, 0.0099, 0.0098] 
  },
]

const TICKER_CONFIGS: Record<string, { sparkColor: string; textColor: string; glowColor: string }> = {
  'BTC/USDT': { sparkColor: '#00F5FF', textColor: 'var(--green)', glowColor: 'rgba(0,245,255,0.35)' },
  'ETH/USDT': { sparkColor: '#D946EF', textColor: 'var(--red)', glowColor: 'rgba(217,70,239,0.35)' },
  'MNT/USDT': { sparkColor: 'var(--green)', textColor: 'var(--green)', glowColor: 'rgba(16,185,129,0.35)' },
  'AGNI/USDT': { sparkColor: '#8B5CF6', textColor: '#8B5CF6', glowColor: 'rgba(139,92,246,0.35)' },
  'MOE/USDT': { sparkColor: '#00F5FF', textColor: 'var(--red)', glowColor: 'rgba(0,245,255,0.35)' },
}

const formatPrice = (val: number) => {
  if (val >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  } else if (val >= 1) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
  } else {
    return '$' + val.toFixed(4)
  }
}

function SparklineArea({ data, color, glowColor }: { data: number[]; color: string; glowColor: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 110, h = 28

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return { x, y }
  })

  // Generates sharp polyline paths (matching realistic crypto charts)
  const linePath = 'M ' + points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`
  const gradId = `grad-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.2"
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
  const [base, quote] = t.symbol.split('/')

  return (
    <div className="flex-1 min-w-[125px] h-[40px] px-2.5 py-1 flex items-center justify-between border border-[rgba(0,245,255,0.25)] bg-[rgba(8,11,26,0.55)] rounded-lg group hover:bg-[rgba(0,245,255,0.02)] transition-colors duration-200 select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_0_15px_rgba(0,245,255,0.08)] gap-1.5">
      {/* Left Column: Symbol, Change, and Price */}
      <div className="flex flex-col justify-center select-none pointer-events-none min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-body text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
            <span className="text-[#FFFFFF]">{base}</span>
            <span className="text-[#64748B]">{quote ? `/${quote}` : ''}</span>
          </span>
          <span className="font-body text-[9px] font-black leading-none shrink-0" style={{ color: config.textColor }}>
            {isUp ? '+' : ''}{t.change.toFixed(1)}%
          </span>
        </div>
        <span className="font-mono text-[11px] font-black text-white mt-0.5 leading-none tracking-wide whitespace-nowrap">
          {formatPrice(t.price)}
        </span>
      </div>

      {/* Right Column: Inline Sparkline Chart */}
      <div className="w-[50px] h-[32px] flex items-center pointer-events-none overflow-visible shrink-0">
        <SparklineArea data={t.spark} color={config.sparkColor} glowColor={config.glowColor} />
      </div>
    </div>
  )
}

const WhaleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_5px_var(--cyan)] overflow-visible">
    {/* Circle trail behind the whale */}
    <circle cx="12" cy="12" r="9" stroke="rgba(0, 245, 255, 0.25)" strokeDasharray="3 2" />
    
    {/* Whale shape: tail on left, body curving up, head on right, flipper at bottom */}
    <path 
      d="M2.5 9.5 C 3.5 8, 5 7.5, 7 8 C 10 8.8, 12 8.5, 14.5 9 C 17.5 9.5, 19.5 11, 20.5 12.5 C 20 14, 18.5 15, 16 15 H 12 C 10 15, 8.5 15.5, 7 16 C 6 15.5, 5 14, 4.5 12.5 C 3.5 12, 2.5 10.5, 2.5 9.5 Z" 
      stroke="var(--cyan)" 
      strokeWidth="1.5" 
    />
    {/* Flipper */}
    <path d="M11.5 15 C11 16.5, 10 17.5, 9 18 C9.5 17, 10 16, 10.5 15" stroke="var(--cyan)" strokeWidth="1.5" />
    {/* Tail fins */}
    <path d="M2.5 9.5 C 2 8.5, 1.5 7.5, 1.8 6.5 C 2.5 7.5, 2.8 8.5, 2.5 9.5 Z" stroke="var(--cyan)" strokeWidth="1.2" fill="rgba(0,245,255,0.2)" />
    <path d="M2.5 9.5 C 1.8 10.2, 1 10.8, 0.8 11.8 C 1.5 11.2, 2.2 10.5, 2.5 9.5 Z" stroke="var(--cyan)" strokeWidth="1.2" fill="rgba(0,245,255,0.2)" />
    {/* Eye */}
    <circle cx="16.5" cy="11.5" r="0.5" fill="var(--cyan)" />
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
    <div className="flex items-center gap-2.5 h-full w-full overflow-hidden animate-in">
      {/* Logo Card */}
      <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 h-[40px] border border-[rgba(0,245,255,0.25)] bg-[rgba(8,11,26,0.55)] rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_0_15px_rgba(0,245,255,0.08)] select-none">
        <WhaleIcon />
        <span className="font-body text-[10px] font-black tracking-[0.12em] text-[var(--cyan)] drop-shadow-[0_0_6px_var(--cyan)] select-none leading-none">
          GHOSTWHALE
        </span>
      </div>

      {/* Tickers container - flex-1 stretches dynamically to fill the center space */}
      <div className="hidden md:flex flex-1 items-center gap-2.5 overflow-hidden select-none">
        {tickers.map((t, i) => <TickerItem key={`${t.symbol}-${i}`} t={t} />)}
      </div>
    </div>
  )
}

