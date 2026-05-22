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
  info:    '[AI]',
  alert:   '[⚠]',
  success: '[✓]',
  scan:    '[↻]',
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

export default function ThoughtStream({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <Brain size={14} color="var(--purple)" />
          </motion.div>
          <span className="font-orbitron text-[9px] font-bold tracking-widest"
            style={{ color: 'var(--purple)' }}>
            AI THOUGHT STREAM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={10} color="var(--cyan)" />
          <span className="font-mono text-[9px]" style={{ color: 'rgba(0,245,255,0.6)' }}>
            LIVE
          </span>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--purple)' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
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
