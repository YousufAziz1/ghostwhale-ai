import { useEffect, useState, useMemo } from 'react'
import type { WhaleEvent } from '@/types'

// A simple deterministic pseudo-random number generator
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

export default function NetworkMap({ events }: { events: WhaleEvent[] }) {
  const [pulses, setPulses] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number; color: string }[]>([])

  // Generate stable node positions for unique wallets
  const nodes = useMemo(() => {
    const uniqueWallets = Array.from(new Set(events.map(e => e.from_wallet)))
    return uniqueWallets.map((wallet, i) => {
      // Deterministic angle and radius based on wallet hash/index
      const seed = wallet.charCodeAt(0) + wallet.charCodeAt(5) + i
      const angle = seededRandom(seed) * Math.PI * 2
      const radius = 80 + seededRandom(seed + 1) * 60 // 80 to 140
      return {
        id: wallet,
        x: 200 + Math.cos(angle) * radius,
        y: 150 + Math.sin(angle) * radius,
      }
    })
  }, [events])

  const centerNode = { x: 200, y: 150 }

  // Trigger pulse animations on new events
  useEffect(() => {
    if (events.length === 0) return
    const latest = events[events.length - 1]
    const node = nodes.find(n => n.id === latest.from_wallet)
    if (!node) return

    const isBuy = latest.action === 'buy'
    const color = isBuy ? 'var(--accent)' : latest.action === 'sell' ? 'var(--accent-red)' : 'var(--accent-2)'
    
    // Determine direction
    const x1 = isBuy ? centerNode.x : node.x
    const y1 = isBuy ? centerNode.y : node.y
    const x2 = isBuy ? node.x : centerNode.x
    const y2 = isBuy ? node.y : centerNode.y

    const pulse = { id: Math.random().toString(), x1, y1, x2, y2, color }
    setPulses(prev => [...prev.slice(-10), pulse]) // keep last 10
  }, [events, nodes])

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-[var(--bg-base)] overflow-hidden border border-[var(--border-subtle)] rounded-xl group">
      <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
      
      {/* Label */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-3)] animate-ping" />
        <span className="font-mono text-[10px] uppercase text-[var(--accent-3)] tracking-widest font-bold">Mantle Network Graph</span>
      </div>

      <svg width="400" height="300" viewBox="0 0 400 300" className="w-full h-full">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-2)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Center DEX Node */}
        <circle cx={centerNode.x} cy={centerNode.y} r="40" fill="url(#glow)" className="animate-pulse" />
        <circle cx={centerNode.x} cy={centerNode.y} r="15" fill="var(--bg-surface)" stroke="var(--accent-2)" strokeWidth="2" />
        <text x={centerNode.x} y={centerNode.y + 4} textAnchor="middle" fill="var(--accent-2)" fontSize="10" className="font-mono font-bold">DEX</text>

        {/* Connections and Nodes */}
        {nodes.map(n => (
          <g key={n.id}>
            <line x1={centerNode.x} y1={centerNode.y} x2={n.x} y2={n.y} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
            <circle cx={n.x} cy={n.y} r="4" fill="var(--bg-surface)" stroke="var(--text-muted)" strokeWidth="1.5" />
          </g>
        ))}

        {/* Animated Pulses */}
        {pulses.map(p => (
          <circle key={p.id} r="3" fill={p.color} style={{ filter: `drop-shadow(0 0 8px ${p.color})` }}>
            <animateMotion
              path={`M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`}
              dur="0.8s"
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
            />
            <animate attributeName="opacity" values="1;0" dur="0.8s" fill="freeze" />
          </circle>
        ))}
      </svg>
    </div>
  )
}
