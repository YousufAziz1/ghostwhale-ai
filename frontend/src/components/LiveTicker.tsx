import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TickerToken {
  symbol: string
  price: number
  change24h: number
}

const MOCK_TICKERS: TickerToken[] = [
  { symbol: 'MNT',  price: 1.10,    change24h:  2.4 },
  { symbol: 'mETH', price: 3812.50, change24h: -0.8 },
  { symbol: 'USDT', price: 1.0001,  change24h:  0.01 },
  { symbol: 'USDY', price: 1.0534,  change24h:  0.12 },
  { symbol: 'USDC', price: 0.9998,  change24h: -0.02 },
  { symbol: 'WETH', price: 3812.50, change24h: -0.8 },
]

function TickerItem({ token }: { token: TickerToken }) {
  const isUp   = token.change24h > 0
  const isDown = token.change24h < 0

  return (
    <div className="flex items-center gap-3 px-6 border-r border-[var(--border-subtle)] shrink-0">
      <span className="font-mono text-xs text-[var(--text-muted)] tracking-wider">{token.symbol}</span>
      <span className="font-mono text-sm text-[var(--text-primary)] font-medium">
        ${token.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </span>
      <span className={`flex items-center gap-1 font-mono text-xs ${isUp ? 'text-[var(--accent)]' : isDown ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
        {isUp ? <TrendingUp size={10} /> : isDown ? <TrendingDown size={10} /> : <Minus size={10} />}
        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
      </span>
    </div>
  )
}

interface LiveTickerProps {
  isConnected: boolean
  latestBlock?: number
}

export default function LiveTicker({ isConnected, latestBlock }: LiveTickerProps) {
  const [tickers, setTickers] = useState<TickerToken[]>(MOCK_TICKERS)
  const [time, setTime] = useState(new Date())

  // Simulate small price movements every 5 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setTickers(prev => prev.map(t => ({
        ...t,
        price: t.price * (1 + (Math.random() - 0.499) * 0.001),
        change24h: t.change24h + (Math.random() - 0.5) * 0.05,
      })))
      setTime(new Date())
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  // Duplicate for seamless loop
  const doubled = [...tickers, ...tickers]

  return (
    <header
      id="live-ticker"
      className="relative flex items-center h-10 border-b border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface)]"
    >
      {/* Left status bar */}
      <div className="flex items-center gap-2 px-4 shrink-0 border-r border-[var(--border-subtle)] h-full bg-[var(--bg-card)]">
        <div className={`live-dot ${isConnected ? '' : 'opacity-30'}`} />
        <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden">
        <div className="marquee-track flex whitespace-nowrap">
          {doubled.map((t, i) => <TickerItem key={`${t.symbol}-${i}`} token={t} />)}
        </div>
      </div>

      {/* Right: block + time */}
      <div className="shrink-0 flex items-center gap-4 px-4 border-l border-[var(--border-subtle)] h-full bg-[var(--bg-card)]">
        {latestBlock && (
          <span className="font-mono text-[10px] text-[var(--accent)] tracking-wider">
            #{latestBlock.toLocaleString()}
          </span>
        )}
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {time.toUTCString().slice(17, 25)} UTC
        </span>
      </div>
    </header>
  )
}
