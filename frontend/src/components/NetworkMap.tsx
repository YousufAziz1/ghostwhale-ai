import { useEffect, useState, useMemo, useRef } from 'react'
import type { WhaleEvent } from '@/types'

interface Pulse {
  id: string
  x1: number; y1: number; x2: number; y2: number
  color: string
  progress: number
}

interface Node {
  id: string
  x: number
  y: number
  label: string
  score: number
}

// Stable deterministic position from wallet string
function walletToXY(wallet: string, W: number, H: number, idx: number) {
  const seed = (wallet.charCodeAt(2) ?? 65) + (wallet.charCodeAt(4) ?? 80) + idx * 13
  // arrange in an ellipse around center
  const total = 12
  const angle = ((seed % total) / total) * Math.PI * 2
  const rx = W * 0.35
  const ry = H * 0.37
  return {
    x: W / 2 + Math.cos(angle) * rx + (seed % 7) * 4 - 14,
    y: H / 2 + Math.sin(angle) * ry + (seed % 5) * 3 - 7,
  }
}

export default function NetworkMap({ events }: { events: WhaleEvent[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ w: 500, h: 280 })
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [scanAngle, setScanAngle] = useState(0)

  // Responsive sizing
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (svgRef.current?.parentElement) obs.observe(svgRef.current.parentElement)
    return () => obs.disconnect()
  }, [])

  // Rotating radar scan line
  useEffect(() => {
    const iv = setInterval(() => setScanAngle(a => (a + 2) % 360), 40)
    return () => clearInterval(iv)
  }, [])

  const cx = dims.w / 2
  const cy = dims.h / 2

  // Build stable node list from unique wallets
  const nodes: Node[] = useMemo(() => {
    const seen = new Map<string, Node>()
    events.forEach((e, i) => {
      if (!seen.has(e.from_wallet)) {
        const pos = walletToXY(e.from_wallet, dims.w, dims.h, seen.size)
        seen.set(e.from_wallet, {
          id: e.from_wallet,
          x: pos.x,
          y: pos.y,
          label: e.from_wallet.slice(0, 6) + '…',
          score: e.wallet_score,
        })
      }
    })
    return Array.from(seen.values()).slice(0, 12)
  }, [events.length, dims.w, dims.h]) // eslint-disable-line

  // Trigger pulse on new events
  const prevLen = useRef(events.length)
  useEffect(() => {
    if (events.length <= prevLen.current) { prevLen.current = events.length; return }
    const latest = events[0]
    const node = nodes.find(n => n.id === latest.from_wallet) ?? nodes[Math.floor(Math.random() * nodes.length)]
    if (!node) return
    const isBuy = latest.action === 'buy' || latest.action === 'lp_add'
    const color = isBuy ? '#00ff88' : latest.action === 'sell' ? '#ff1e56' : '#00d4ff'
    const pulse: Pulse = {
      id: Math.random().toString(),
      x1: isBuy ? node.x : cx,
      y1: isBuy ? node.y : cy,
      x2: isBuy ? cx : node.x,
      y2: isBuy ? cy : node.y,
      color,
      progress: 0,
    }
    setPulses(prev => [...prev.slice(-8), pulse])
    prevLen.current = events.length
  }, [events.length, nodes, cx, cy])

  // Animate pulses
  useEffect(() => {
    const iv = setInterval(() => {
      setPulses(prev => prev
        .map(p => ({ ...p, progress: p.progress + 0.04 }))
        .filter(p => p.progress < 1.2)
      )
    }, 20)
    return () => clearInterval(iv)
  }, [])

  const scanRad = (scanAngle * Math.PI) / 180
  const scanR = Math.max(dims.w, dims.h)

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]">
      {/* Label */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-3)] animate-ping shrink-0" />
        <span className="font-mono text-[9px] uppercase text-[var(--accent-3)] tracking-widest font-bold">
          Mantle Network Graph · {nodes.length} wallets
        </span>
      </div>

      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-full">
        <defs>
          {/* Radar gradient */}
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b026ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#b026ff" stopOpacity="0" />
          </radialGradient>
          {/* DEX glow */}
          <radialGradient id="dexGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </radialGradient>
          {/* Pulse gradient */}
          {pulses.map(p => (
            <linearGradient key={p.id} id={`pg-${p.id}`} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={p.color} stopOpacity="0" />
              <stop offset="50%" stopColor={p.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Radar scan sector */}
        <path
          d={`M ${cx} ${cy} L ${cx + Math.cos(scanRad - 0.35) * scanR} ${cy + Math.sin(scanRad - 0.35) * scanR} A ${scanR} ${scanR} 0 0 1 ${cx + Math.cos(scanRad) * scanR} ${cy + Math.sin(scanRad) * scanR} Z`}
          fill="url(#radarGlow)"
          opacity="0.6"
        />

        {/* Concentric range rings */}
        {[0.2, 0.38, 0.56].map((r, i) => (
          <ellipse
            key={i}
            cx={cx} cy={cy}
            rx={dims.w * r} ry={dims.h * r * 0.85}
            fill="none"
            stroke="rgba(176,38,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Connection lines */}
        {nodes.map(n => (
          <line
            key={n.id}
            x1={cx} y1={cy} x2={n.x} y2={n.y}
            stroke="rgba(0,212,255,0.12)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        {/* Animated transaction pulses */}
        {pulses.map(p => {
          const t = Math.min(p.progress, 1)
          const dotX = p.x1 + (p.x2 - p.x1) * t
          const dotY = p.y1 + (p.y2 - p.y1) * t
          const opacity = t < 0.8 ? 1 : (1 - t) / 0.2
          return (
            <g key={p.id}>
              <line
                x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                stroke={`url(#pg-${p.id})`}
                strokeWidth="1.5"
                opacity={opacity * 0.5}
              />
              <circle cx={dotX} cy={dotY} r="4" fill={p.color} opacity={opacity}
                style={{ filter: `drop-shadow(0 0 8px ${p.color})` }} />
            </g>
          )
        })}

        {/* Wallet nodes */}
        {nodes.map(n => {
          const color = n.score >= 0.8 ? '#00ff88' : n.score >= 0.6 ? '#00d4ff' : '#ffd700'
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r="14" fill="rgba(0,0,0,0.6)"
                stroke={color} strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
              <text x={n.x} y={n.y + 3} textAnchor="middle" fill={color}
                fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                {n.label}
              </text>
            </g>
          )
        })}

        {/* Central DEX node */}
        <circle cx={cx} cy={cy} r="52" fill="url(#dexGlow)" opacity="0.5" />
        <circle cx={cx} cy={cy} r="26" fill="var(--bg-surface)"
          stroke="var(--accent-2)" strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 12px var(--accent-2))' }} />
        <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--accent-2)"
          fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="bold">DEX</text>
        <text x={cx} y={cy + 7} textAnchor="middle" fill="var(--text-muted)"
          fontSize="7" fontFamily="JetBrains Mono, monospace">Mantle</text>
      </svg>
    </div>
  )
}
