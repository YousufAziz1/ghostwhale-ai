import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, useAnimationFrame } from 'framer-motion'
import type { WhaleEvent } from '@/types'

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }
interface Beam { fromNode: number; progress: number; color: string; id: number }

interface AICoreProps {
  active: boolean
  whaleCount: number
  events: WhaleEvent[]
}

const ORBIT_NODES = [
  { label: 'mETH',  color: '#00F5FF', speed: 0.4,  radius: 0.38, phase: 0 },
  { label: 'WMNT',  color: '#7C3AED', speed: 0.28, radius: 0.44, phase: 1.2 },
  { label: 'AGNI',  color: '#10B981', speed: 0.55, radius: 0.32, phase: 2.4 },
  { label: 'MOE',   color: '#F59E0B', speed: 0.33, radius: 0.48, phase: 0.8 },
  { label: 'USDY',  color: '#3B82F6', speed: 0.22, radius: 0.41, phase: 3.6 },
  { label: 'USDC',  color: '#00F5FF', speed: 0.45, radius: 0.29, phase: 5.0 },
]

export default function AICore({ active, whaleCount, events }: AICoreProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const svgRef     = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims]       = useState({ w: 400, h: 300 })
  const [scanAngle, setScanAngle] = useState(0)
  const [locked, setLocked]   = useState(false)
  const [beams, setBeams]     = useState<Beam[]>([])
  const [time, setTime]       = useState(0)
  const particlesRef = useRef<Particle[]>([])
  const beamIdRef    = useRef(0)
  const prevCount    = useRef(whaleCount)

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(e => {
      const r = e[0].contentRect
      setDims({ w: r.width, h: r.height })
    })
    obs.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => obs.disconnect()
  }, [])

  // Seed initial particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: 40 }, () => makeParticle(dims.w / 2, dims.h / 2, dims))
  }, [dims])

  // Trigger lock + beam on new whale
  useEffect(() => {
    if (whaleCount > prevCount.current) {
      setLocked(true)
      const ni = Math.floor(Math.random() * ORBIT_NODES.length)
      setBeams(b => [...b.slice(-5), { fromNode: ni, progress: 0, color: events[0]?.action === 'buy' ? '#10B981' : '#FF3B5C', id: beamIdRef.current++ }])
      const t = setTimeout(() => setLocked(false), 4000)
      return () => clearTimeout(t)
    }
    prevCount.current = whaleCount
  }, [whaleCount, events])

  // Radar + time
  useEffect(() => {
    const iv = setInterval(() => {
      setScanAngle(a => (a + 1.0) % 360)
      setTime(t => t + 1)
    }, 16)
    return () => clearInterval(iv)
  }, [])

  // Canvas particle animation
  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = dims
    const cx = w / 2, cy = h / 2

    ctx.clearRect(0, 0, w, h)

    // Spawn particles near active nodes
    if (active && Math.random() < 0.3) {
      const ni = Math.floor(Math.random() * ORBIT_NODES.length)
      const n  = ORBIT_NODES[ni]
      const r  = Math.min(w, h) * n.radius
      const angle = n.phase + time * n.speed * 0.01
      const nx = cx + Math.cos(angle) * r
      const ny = cy + Math.sin(angle) * r * 0.45
      particlesRef.current.push(makeParticle(nx, ny, dims, n.color))
    }
    // Always spawn some ambient particles
    if (Math.random() < 0.15) {
      particlesRef.current.push(makeParticle(
        cx + (Math.random() - 0.5) * Math.min(w, h) * 0.6,
        cy + (Math.random() - 0.5) * h * 0.5,
        dims
      ))
    }

    // Update + draw particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.life--
      p.vx *= 0.98; p.vy *= 0.98
      const alpha = (p.life / p.maxLife) * 0.7
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba')
      ctx.shadowBlur  = 4
      ctx.shadowColor = p.color
      ctx.fill()
      return p.life > 0
    })

    // Draw beams: node → center
    setBeams(prev => prev
      .map(b => ({ ...b, progress: b.progress + 0.025 }))
      .filter(b => b.progress < 1.1)
      .map(b => {
        const n = ORBIT_NODES[b.fromNode]
        const r = Math.min(w, h) * n.radius
        const ang = n.phase + time * n.speed * 0.01
        const nx = cx + Math.cos(ang) * r
        const ny = cy + Math.sin(ang) * r * 0.45
        const t = Math.min(b.progress, 1)
        const bx = nx + (cx - nx) * t
        const by = ny + (cy - ny) * t
        const alpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2

        // Beam line
        const grad = ctx.createLinearGradient(nx, ny, bx, by)
        grad.addColorStop(0, b.color + '00')
        grad.addColorStop(0.5, b.color + 'aa')
        grad.addColorStop(1, b.color)
        ctx.beginPath()
        ctx.moveTo(nx, ny); ctx.lineTo(bx, by)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.globalAlpha = alpha
        ctx.shadowBlur = 8; ctx.shadowColor = b.color
        ctx.stroke()
        ctx.globalAlpha = 1

        // Dot at leading edge
        ctx.beginPath()
        ctx.arc(bx, by, 3, 0, Math.PI * 2)
        ctx.fillStyle = b.color
        ctx.shadowBlur = 12; ctx.shadowColor = b.color
        ctx.globalAlpha = alpha
        ctx.fill()
        ctx.globalAlpha = 1; ctx.shadowBlur = 0

        return b
      })
    )
  })

  const cx = dims.w / 2
  const cy = dims.h / 2
  const maxR = Math.min(dims.w, dims.h) * 0.46

  // Compute scan sector
  const scanRad = (scanAngle * Math.PI) / 180
  const sx1 = cx + Math.cos(scanRad - 0.45) * maxR
  const sy1 = cy + Math.sin(scanRad - 0.45) * maxR
  const sx2 = cx + Math.cos(scanRad) * maxR
  const sy2 = cy + Math.sin(scanRad) * maxR

  // Orbiting node positions
  const nodePositions = useMemo(() => ORBIT_NODES.map(n => {
    const r = Math.min(dims.w, dims.h) * n.radius
    const ang = n.phase + time * n.speed * 0.01
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * 0.45 }
  }), [time, cx, cy, dims]) // eslint-disable-line

  const accentColor = locked ? '#FF3B5C' : '#00F5FF'
  const coreR = Math.min(dims.w, dims.h) * 0.09

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-xl">
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        className="absolute inset-0"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* SVG: radar, rings, nodes, orb */}
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        className="absolute inset-0"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
      >
        <defs>
          <radialGradient id="ambientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={locked ? '#FF3B5C' : '#00F5FF'} stopOpacity="0.18" />
            <stop offset="100%" stopColor="#050816" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={locked ? '#FF3B5C' : '#00F5FF'} stopOpacity="0.9" />
            <stop offset="60%"  stopColor="#3B82F6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#050816" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="scanSector" cx="0%" cy="50%" r="100%">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <ellipse cx={cx} cy={cy} rx={maxR * 1.1} ry={maxR * 0.85}
          fill="url(#ambientGlow)" />

        {/* Grid rings */}
        {[0.85, 0.65, 0.45, 0.25].map((f, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={maxR * f} ry={maxR * f * 0.7}
            fill="none"
            stroke={locked ? 'rgba(255,59,92,0.1)' : 'rgba(0,245,255,0.07)'}
            strokeWidth="1" strokeDasharray="3 9" />
        ))}

        {/* Outer ring */}
        <ellipse cx={cx} cy={cy} rx={maxR} ry={maxR * 0.7}
          fill="none"
          stroke={locked ? 'rgba(255,59,92,0.35)' : 'rgba(0,245,255,0.2)'}
          strokeWidth="1.5" strokeDasharray="8 5" />

        {/* Rotating elliptical orbit path */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'orbitSpin 20s linear infinite' }}>
          <ellipse cx={cx} cy={cy} rx={maxR * 0.65} ry={maxR * 0.22}
            fill="none" stroke="rgba(0,245,255,0.15)" strokeWidth="1" />
        </g>
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'orbitSpin 30s linear infinite reverse' }}>
          <ellipse cx={cx} cy={cy} rx={maxR * 0.48} ry={maxR * 0.17}
            fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="1" strokeDasharray="4 6" />
        </g>

        {/* Radar scan sector */}
        <path
          d={`M ${cx} ${cy} L ${sx1} ${sy1} A ${maxR} ${maxR * 0.7} 0 0 1 ${sx2} ${sy2} Z`}
          fill="url(#scanSector)" opacity="0.6"
        />

        {/* Radar arm */}
        <line x1={cx} y1={cy} x2={sx2} y2={sy2}
          stroke={locked ? 'rgba(255,59,92,0.7)' : 'rgba(0,245,255,0.5)'}
          strokeWidth="1"
          style={{ filter: `drop-shadow(0 0 3px ${accentColor})` }} />

        {/* Connection lines: node → center */}
        {nodePositions.map((pos, i) => (
          <line key={i} x1={pos.x} y1={pos.y} x2={cx} y2={cy}
            stroke={ORBIT_NODES[i].color}
            strokeWidth="0.5"
            strokeDasharray="2 8"
            opacity="0.25" />
        ))}

        {/* Orbiting wallet nodes */}
        {nodePositions.map((pos, i) => {
          const n = ORBIT_NODES[i]
          return (
            <g key={i}>
              {/* Glow halo */}
              <circle cx={pos.x} cy={pos.y} r="12" fill={n.color} opacity="0.08"
                style={{ filter: `blur(4px)` }} />
              {/* Node circle */}
              <circle cx={pos.x} cy={pos.y} r="8"
                fill="var(--bg-surface)"
                stroke={n.color}
                strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 5px ${n.color})` }} />
              {/* Label */}
              <text x={pos.x} y={pos.y + 3} textAnchor="middle"
                fill={n.color} fontSize="5.5"
                fontFamily="JetBrains Mono, monospace" fontWeight="700">
                {n.label}
              </text>
            </g>
          )
        })}

        {/* Core orb */}
        <circle cx={cx} cy={cy} r={coreR * 1.6} fill="url(#coreGrad)" opacity="0.3"
          style={{ animation: 'orbBreath 3s ease-in-out infinite' }} />
        <circle cx={cx} cy={cy} r={coreR}
          fill="var(--bg-surface)"
          stroke={accentColor}
          strokeWidth="2"
          style={{
            animation: 'orbBreath 3s ease-in-out infinite',
            filter: `drop-shadow(0 0 ${locked ? 24 : 16}px ${accentColor})`,
          }} />
        <circle cx={cx} cy={cy} r={coreR * 0.65}
          fill="none" stroke={accentColor} strokeWidth="1" opacity="0.4" />

        {/* Core text */}
        <text x={cx} y={cy - coreR * 0.18} textAnchor="middle"
          fill={accentColor} fontSize={coreR * 0.22}
          fontFamily="Orbitron, sans-serif" fontWeight="800" letterSpacing="1">
          GHOST
        </text>
        <text x={cx} y={cy + coreR * 0.18} textAnchor="middle"
          fill={accentColor} fontSize={coreR * 0.22}
          fontFamily="Orbitron, sans-serif" fontWeight="800" letterSpacing="1">
          WHALE
        </text>

        {/* Status dot + text */}
        <circle cx={cx} cy={cy + coreR + 14} r="3.5"
          fill={locked ? '#FF3B5C' : '#10B981'}
          style={{ filter: `drop-shadow(0 0 6px ${locked ? '#FF3B5C' : '#10B981'})`,
            animation: 'livePulse 1.4s ease-in-out infinite' }} />
        <text x={cx + 8} y={cy + coreR + 18} fill="rgba(0,245,255,0.5)"
          fontSize="6.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
          {locked ? '⚠ TARGET LOCK' : active ? 'AI SCANNING' : 'MONITORING'}
        </text>

        {/* Corner target brackets */}
        {([-1, 1] as const).flatMap(sx => ([-1, 1] as const).map(sy => {
          const bx = cx + sx * maxR * 0.92
          const by = cy + sy * maxR * 0.68
          return (
            <g key={`${sx}${sy}`}>
              <line x1={bx} y1={by} x2={bx + sx * 14} y2={by}
                stroke={accentColor} strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 4px ${accentColor})` }} />
              <line x1={bx} y1={by} x2={bx} y2={by + sy * 14}
                stroke={accentColor} strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 4px ${accentColor})` }} />
            </g>
          )
        }))}

        {/* Wave pulses when locked */}
        {locked && [0, 0.5, 1].map(delay => (
          <motion.circle key={delay} cx={cx} cy={cy} r={coreR}
            fill="none" stroke={accentColor} strokeWidth="1.5"
            initial={{ r: coreR, opacity: 0.8 }}
            animate={{ r: maxR, opacity: 0 }}
            transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeOut' }} />
        ))}
      </svg>

      {/* Label overlay */}
      <div
        className="absolute top-2 left-3 flex items-center gap-2"
        style={{ pointerEvents: 'none' }}
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: locked ? '#FF3B5C' : '#7C3AED', boxShadow: `0 0 8px ${locked ? '#FF3B5C' : '#7C3AED'}` }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="font-orbitron text-[8px] tracking-widest font-bold"
          style={{ color: locked ? '#FF3B5C' : 'rgba(124,58,237,0.8)' }}>
          {locked ? 'TARGET ACQUIRED · ' : 'MANTLE NETWORK · '}{ORBIT_NODES.length} NODES TRACKED
        </span>
      </div>
    </div>
  )
}

function makeParticle(x: number, y: number, dims: { w: number; h: number }, color?: string): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.3 + Math.random() * 0.8
  const colors = ['rgb(0,245,255)', 'rgb(59,130,246)', 'rgb(124,58,237)', 'rgb(16,185,129)']
  const c = color ? color.replace('#', 'rgb(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) =>
    `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)})`) : colors[Math.floor(Math.random() * colors.length)]
  const maxLife = 60 + Math.floor(Math.random() * 80)
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: maxLife, maxLife, color: c }
}
