import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Zap } from 'lucide-react'

interface LogEntry {
  id: string
  time: string
  text: string
  color: string
  type: 'info' | 'alert' | 'success' | 'scan'
}

const typeColors = {
  info:    'var(--cyan)',
  alert:   'var(--red)',
  success: 'var(--green)',
  scan:    'var(--purple)',
}
const typePrefixes = {
  info:    '[SYSTEM_INFO]',
  alert:   '[NEURAL_ANOMALY]',
  success: '[DECISION_EXEC]',
  scan:    '[POOL_SCANNING]',
}

function Typewriter({ text, speed = 18 }: { text: string; speed?: number }) {
  const [disp, setDisp] = useState('')

  useEffect(() => {
    setDisp('')
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisp(text.slice(0, i))
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return (
    <span>
      {disp}
      {disp.length < text.length && (
        <span
          className="inline-block w-1.5 h-3 ml-0.5 align-middle animate-typing-cursor"
          style={{ background: 'currentColor' }}
        />
      )}
    </span>
  )
}

const NODES = [
  { id: 'scn', label: 'SCAN', x: 30, y: 35, color: 'var(--cyan)' },
  { id: 'thr', label: 'THREAT', x: 95, y: 20, color: 'var(--red)' },
  { id: 'mdl', label: 'MODEL', x: 95, y: 70, color: 'var(--blue)' },
  { id: 'dec', label: 'DECIDE', x: 165, y: 45, color: 'var(--purple)' },
  { id: 'rtr', label: 'ROUTER', x: 235, y: 25, color: 'var(--green)' },
  { id: 'out', label: 'OUTPUT', x: 235, y: 65, color: 'var(--cyan)' },
]

const CONNECTIONS = [
  { id: 'c1', from: [30, 35], to: [95, 20], duration: 1.6, delay: 0 },
  { id: 'c2', from: [30, 35], to: [95, 70], duration: 2.0, delay: 0.4 },
  { id: 'c3', from: [95, 20], to: [165, 45], duration: 1.4, delay: 0.2 },
  { id: 'c4', from: [95, 70], to: [165, 45], duration: 1.8, delay: 0.6 },
  { id: 'c5', from: [165, 45], to: [235, 25], duration: 1.5, delay: 0.3 },
  { id: 'c6', from: [165, 45], to: [235, 65], duration: 1.7, delay: 0.7 },
  { id: 'c7', from: [95, 20], to: [95, 70], duration: 2.2, delay: 0.1 },
  { id: 'c8', from: [235, 25], to: [235, 65], duration: 2.0, delay: 0.5 },
]

function NeuralSynapseGraph() {
  return (
    <div className="relative w-full h-[95px] bg-[rgba(8,11,26,0.35)] border-b border-[rgba(0,245,255,0.06)] overflow-hidden flex items-center justify-center">
      {/* Background Dots */}
      <div className="absolute inset-0 bg-dots opacity-[0.2] pointer-events-none" />
      
      {/* Radial center ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />

      <svg width="100%" height="100%" viewBox="0 0 280 90" className="w-[280px] h-[90px] shrink-0 select-none overflow-visible">
        {/* Draw Connection Lines */}
        {CONNECTIONS.map((conn) => (
          <g key={conn.id}>
            <line
              x1={conn.from[0]}
              y1={conn.from[1]}
              x2={conn.to[0]}
              y2={conn.to[1]}
              stroke="var(--border-bright)"
              strokeWidth="0.8"
              strokeOpacity="0.25"
            />
            {/* Pulse */}
            <motion.circle
              r="1.2"
              fill={conn.id.charCodeAt(1) % 2 === 0 ? 'var(--cyan)' : 'var(--purple)'}
              animate={{
                cx: [conn.from[0], conn.to[0]],
                cy: [conn.from[1], conn.to[1]],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: conn.duration,
                repeat: Infinity,
                ease: 'linear',
                delay: conn.delay,
              }}
              style={{
                filter: `drop-shadow(0 0 2px ${conn.id.charCodeAt(1) % 2 === 0 ? 'var(--cyan)' : 'var(--purple)'})`,
              }}
            />
          </g>
        ))}

        {/* Draw Nodes */}
        {NODES.map((node) => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="4.5"
              fill={node.color}
              opacity="0.1"
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.1, 0.35, 0.1],
              }}
              transition={{
                duration: 2.2 + (node.id.charCodeAt(0) % 5) * 0.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <circle
              cx={node.x}
              cy={node.y}
              r="2.5"
              fill={node.color}
              style={{
                filter: `drop-shadow(0 0 3px ${node.color})`,
              }}
            />
            <circle
              cx={node.x}
              cy={node.y}
              r="0.8"
              fill="#FFFFFF"
            />
            <text
              x={node.x}
              y={node.y + 11}
              fill="rgba(255,255,255,0.45)"
              fontSize="5.5"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
              letterSpacing="0.5"
              className="font-mono tracking-wider"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function ThoughtStream({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Upgraded Header with Neural Synapse Graph */}
      <div className="flex flex-col shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <Brain size={12} color="var(--purple)" />
            </motion.div>
            <span className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--purple)]">
              AI THOUGHT STREAM
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-wider text-[var(--cyan)]">
            <div className="live-dot" style={{ width: 4, height: 4, backgroundColor: 'var(--cyan)' }} />
            LIVE CONNECTED
          </div>
        </div>

        {/* Pulse Synapse Visualizer */}
        <NeuralSynapseGraph />
      </div>

      {/* Log body */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 feed-scroll">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Brain size={32} color="rgba(124,58,237,0.4)" />
            </motion.div>
            <div className="space-y-1">
              <p className="font-orbitron text-[10px]" style={{ color: 'rgba(124,58,237,0.6)' }}>
                NEURAL NETWORK IDLE
              </p>
              <p className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>
                Press SIMULATION to activate AI
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--purple)' }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, delay: i * 0.3, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, i) => {
              const isLast = i === logs.length - 1
              const color = typeColors[log.type] ?? 'var(--cyan)'
              const prefix = typePrefixes[log.type] ?? '[AI]'
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-1 rounded-lg px-3 py-2"
                  style={{
                    background: `linear-gradient(90deg, ${color}08 0%, transparent 70%)`,
                    borderLeft: `2px solid ${isLast ? color : color + '40'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold" style={{ color }}>
                      {prefix}
                    </span>
                    <span className="font-mono text-[8px]" style={{ color: 'var(--text-muted)' }}>
                      {log.time}
                    </span>
                  </div>
                  <div
                    className="font-mono text-[10px] leading-relaxed data-flicker"
                    style={{ color: isLast ? color : 'rgba(226,232,240,0.75)' }}
                  >
                    {isLast ? <Typewriter text={log.text} speed={14} /> : log.text}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
