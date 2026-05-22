import { useState, useEffect, useRef } from 'react'
import { Brain } from 'lucide-react'

interface LogEntry {
  id: string
  time: string
  text: string
  color: string
}

function Typewriter({ text, speed = 15, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [disp, setDisp] = useState('')

  useEffect(() => {
    setDisp('')
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisp(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(iv)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed]) // eslint-disable-line

  return (
    <span>
      {disp}
      {disp.length < text.length && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-typing-cursor align-middle" />
      )}
    </span>
  )
}

export default function AIReasoningEngine({ logs }: { logs: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-black/30">
        <div className="flex items-center gap-2 text-[var(--accent-2)]">
          <Brain size={14} />
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">AI Reasoning Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[var(--text-muted)]">{logs.length} logs</span>
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--accent-2)', boxShadow: '0 0 8px var(--accent-2)' }}
          />
        </div>
      </div>

      {/* Log body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-[var(--text-muted)]">
            <Brain size={28} className="opacity-20" />
            <span className="italic opacity-50">Press LIVE SIMULATION to activate AI brain...</span>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-2)] animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
              ))}
            </div>
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={log.id}
              className="flex flex-col gap-1 border-l-2 pl-3 py-1 rounded-r-lg animate-pop-in"
              style={{
                borderLeftColor: log.color,
                background: `linear-gradient(90deg, ${log.color}12 0%, transparent 80%)`,
              }}
            >
              <div className="text-[9px] text-[var(--text-muted)]">{log.time}</div>
              <div className="leading-relaxed" style={{ color: i === logs.length - 1 ? log.color : 'var(--text-primary)' }}>
                {i === logs.length - 1 ? (
                  <Typewriter text={log.text} speed={12} />
                ) : (
                  log.text
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
