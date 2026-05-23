import { useEffect, useState } from 'react'

function Sparkline({ data, color, gradId }: { data: number[]; color: string; gradId: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 90, h = 22
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  const fillPts = `0,${h} ${pts} ${w},${h}`

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function SmartMoneyAnalysis() {
  const [btcData, setBtcData] = useState([62,64,63,68,66,69,72,70,74])
  const [ethData, setEthData] = useState([38,37,39,38,40,39,41,40,43])

  useEffect(() => {
    const iv = setInterval(() => {
      setBtcData(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.49) * 2])
      setEthData(prev => [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.49) * 1.2])
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-black/30 shrink-0">
        <span className="font-orbitron text-[9px] font-bold tracking-widest text-[#A78BFA]">
          SMART MONEY ANALYSIS
        </span>
      </div>
      <div className="flex-1 p-3 flex justify-between items-center gap-2 select-none">
        {/* BTC */}
        <div className="flex-1 flex items-center justify-between gap-1">
          <div className="flex flex-col font-mono">
            <span className="text-[7.5px] text-[var(--text-muted)] font-bold">BTC/USDT</span>
            <span className="text-[9px] font-bold text-white">${Math.round(btcData[btcData.length - 1] * 1000).toLocaleString()}</span>
          </div>
          <Sparkline data={btcData} color="#00F5FF" gradId="btc-spark-grad" />
        </div>
        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)] shrink-0" />
        {/* ETH */}
        <div className="flex-1 flex items-center justify-between gap-1">
          <div className="flex flex-col font-mono">
            <span className="text-[7.5px] text-[var(--text-muted)] font-bold">ETH/USDT</span>
            <span className="text-[9px] font-bold text-white">${Math.round(ethData[ethData.length - 1] * 100).toLocaleString()}</span>
          </div>
          <Sparkline data={ethData} color="#7C3AED" gradId="eth-spark-grad" />
        </div>
      </div>
    </div>
  )
}
