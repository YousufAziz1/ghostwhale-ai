import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface AICoreProps {
  active: boolean
  whaleCount: number
}

export default function AICore({ active, whaleCount }: AICoreProps) {
  const [scanAngle, setScanAngle] = useState(0)
  const [waveKey, setWaveKey] = useState(0)
  const [locked, setLocked] = useState(false)

  // Rotating radar
  useEffect(() => {
    const iv = setInterval(() => setScanAngle(a => (a + 1.2) % 360), 16)
    return () => clearInterval(iv)
  }, [])

  // Pulse wave on new activity
  useEffect(() => {
    if (whaleCount > 0) {
      setLocked(true)
      setWaveKey(k => k + 1)
      const t = setTimeout(() => setLocked(false), 3000)
      return () => clearTimeout(t)
    }
  }, [whaleCount])

  const cx = 200, cy = 200, r = 200

  const scanRad = (scanAngle * Math.PI) / 180
  const scanSectorPath = [
    `M ${cx} ${cy}`,
    `L ${cx + Math.cos(scanRad - 0.5) * 170} ${cy + Math.sin(scanRad - 0.5) * 170}`,
    `A 170 170 0 0 1 ${cx + Math.cos(scanRad) * 170} ${cy + Math.sin(scanRad) * 170}`,
    'Z',
  ].join(' ')

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background grid dots */}
      <div className="absolute inset-0 bg-dots opacity-30 rounded-xl" />

      {/* SVG core */}
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        style={{ maxWidth: 420, maxHeight: 420 }}
      >
        <defs>
          {/* Orb gradient */}
          <radialGradient id="orbCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#00F5FF" stopOpacity="0.9" />
            <stop offset="30%"  stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="70%"  stopColor="#7C3AED" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#050816" stopOpacity="0" />
          </radialGradient>
          {/* Scan gradient */}
          <radialGradient id="scanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
          {/* Orbit ring gradient */}
          <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00F5FF" stopOpacity="0.8" />
            <stop offset="50%"  stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
          </linearGradient>
          {/* Target lock gradient */}
          <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={locked ? '#FF3B5C' : '#00F5FF'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={locked ? '#FF3B5C' : '#3B82F6'} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Outer ambient glow */}
        <circle cx={cx} cy={cy} r="175" fill="url(#orbCore)" opacity="0.15" />

        {/* Radar scan sector */}
        <path d={scanSectorPath} fill="url(#scanGlow)" opacity="0.5" />

        {/* Concentric range rings */}
        {[140, 110, 80].map((rr, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={rr}
            fill="none"
            stroke={locked ? 'rgba(255,59,92,0.15)' : 'rgba(0,245,255,0.08)'}
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        ))}

        {/* Outer ring */}
        <circle
          cx={cx} cy={cy} r="150"
          fill="none"
          stroke={locked ? 'rgba(255,59,92,0.4)' : 'rgba(0,245,255,0.2)'}
          strokeWidth="1.5"
          strokeDasharray="12 6"
        />

        {/* Rotating orbit ring 1 */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'orbitSpin 12s linear infinite' }}>
          <ellipse
            cx={cx} cy={cy}
            rx="100" ry="36"
            fill="none"
            stroke="url(#orbitGrad)"
            strokeWidth="1"
            opacity="0.6"
          />
        </g>

        {/* Rotating orbit ring 2 (reverse) */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'orbitSpin 18s linear infinite reverse' }}>
          <ellipse
            cx={cx} cy={cy}
            rx="70" ry="26"
            fill="none"
            stroke="rgba(124,58,237,0.5)"
            strokeWidth="1"
            opacity="0.7"
            strokeDasharray="6 4"
          />
        </g>

        {/* Wave pulses on whale detection */}
        {active && (
          <>
            <circle key={`w1-${waveKey}`} cx={cx} cy={cy} r="50"
              fill="none" stroke={locked ? '#FF3B5C' : '#00F5FF'} strokeWidth="2" opacity="0"
              style={{ animation: 'waveExpand 2s ease-out forwards' }} />
            <circle key={`w2-${waveKey}`} cx={cx} cy={cy} r="50"
              fill="none" stroke={locked ? '#FF3B5C' : '#3B82F6'} strokeWidth="1" opacity="0"
              style={{ animation: 'waveExpand 2.4s 0.3s ease-out forwards' }} />
          </>
        )}

        {/* Corner target lock indicators */}
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
          <g key={i} transform={`translate(${cx + sx * 155}, ${cy + sy * 155})`}>
            <line x1="0" y1="0" x2={sx * 12} y2="0"
              stroke={locked ? '#FF3B5C' : '#00F5FF'} strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 4px ${locked ? '#FF3B5C' : '#00F5FF'})` }} />
            <line x1="0" y1="0" x2="0" y2={sy * 12}
              stroke={locked ? '#FF3B5C' : '#00F5FF'} strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 4px ${locked ? '#FF3B5C' : '#00F5FF'})` }} />
          </g>
        ))}

        {/* Core orb */}
        <circle cx={cx} cy={cy} r="38"
          fill="var(--bg-surface)"
          stroke={locked ? 'rgba(255,59,92,0.6)' : 'rgba(0,245,255,0.4)'}
          strokeWidth="2"
          style={{
            animation: 'orbBreath 3s ease-in-out infinite',
            filter: `drop-shadow(0 0 ${locked ? '20px rgba(255,59,92,0.8)' : '16px rgba(0,245,255,0.7)'})`,
          }}
        />
        {/* Inner orb glow */}
        <circle cx={cx} cy={cy} r="24"
          fill="none"
          stroke={locked ? 'rgba(255,59,92,0.5)' : 'rgba(0,245,255,0.35)'}
          strokeWidth="1"
        />
        {/* Core label */}
        <text x={cx} y={cy - 6} textAnchor="middle"
          fill={locked ? '#FF3B5C' : '#00F5FF'}
          fontSize="8" fontFamily="Orbitron, sans-serif" fontWeight="700" letterSpacing="2">
          GHOST
        </text>
        <text x={cx} y={cy + 7} textAnchor="middle"
          fill={locked ? '#FF3B5C' : '#00F5FF'}
          fontSize="8" fontFamily="Orbitron, sans-serif" fontWeight="700" letterSpacing="2">
          WHALE
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle"
          fill="rgba(0,245,255,0.4)"
          fontSize="6" fontFamily="JetBrains Mono, monospace">
          AI-001
        </text>

        {/* Status indicator */}
        <circle cx={cx} cy={cy + 48} r="4"
          fill={locked ? '#FF3B5C' : '#10B981'}
          style={{ animation: 'livePulse 1.4s ease-in-out infinite',
            filter: `drop-shadow(0 0 6px ${locked ? '#FF3B5C' : '#10B981'})` }} />
        <text x={cx + 10} y={cy + 52} fill="rgba(0,245,255,0.5)"
          fontSize="6" fontFamily="JetBrains Mono, monospace">
          {locked ? 'TARGET LOCK' : active ? 'SCANNING' : 'STANDBY'}
        </text>
      </svg>

      {/* Floating token labels */}
      {['mETH', 'WMNT', 'AGNI', 'MOE', 'USDY'].map((token, i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
        const rx = 48, ry = 38
        return (
          <motion.div
            key={token}
            className="absolute font-mono text-[9px] font-bold px-2 py-0.5 rounded"
            style={{
              left: `calc(50% + ${Math.cos(angle) * rx}%)`,
              top: `calc(50% + ${Math.sin(angle) * ry}%)`,
              transform: 'translate(-50%, -50%)',
              color: 'var(--cyan)',
              background: 'rgba(0,245,255,0.08)',
              border: '1px solid rgba(0,245,255,0.2)',
              boxShadow: '0 0 8px rgba(0,245,255,0.15)',
            }}
            animate={{
              y: [0, -4, 0],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3,
              delay: i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {token}
          </motion.div>
        )
      })}
    </div>
  )
}
