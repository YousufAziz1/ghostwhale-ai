import { useState, useEffect } from 'react'

interface LogEntry {
  id: string
  time: string
  text: string
  color: string
}

export default function AIReasoningEngine({ logs }: { logs: LogEntry[] }) {
  // Simple auto-scroll to bottom behavior
  return (
    <div className="card border-spin-wrapper flex flex-col h-full overflow-hidden bg-[var(--bg-card)]">
      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2 text-[var(--accent-2)]">
          <span className="text-sm">🧠</span>
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">AI Reasoning Engine</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-[var(--accent-2)] animate-pulse" style={{ boxShadow: '0 0 8px var(--cyan-glow)' }} />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-[var(--text-muted)] italic opacity-50">Waiting for on-chain anomalies...</div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="animate-pop-in flex flex-col gap-1 border-l-2 pl-3 py-1" style={{ borderLeftColor: log.color, background: `linear-gradient(90deg, ${log.color}11 0%, transparent 100%)` }}>
              <div className="text-[10px] text-[var(--text-muted)]">{log.time}</div>
              <div className="text-[var(--text-primary)] leading-relaxed">
                {/* Typing effect simulation for the latest log only */}
                {i === logs.length - 1 ? (
                  <Typewriter text={log.text} speed={10} />
                ) : (
                  log.text
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Typewriter({ text, speed }: { text: string, speed: number }) {
  const [disp, setDisp] = useState('')
  useEffect(() => {
    setDisp('')
    let i = 0
    const iv = setInterval(() => {
      setDisp(text.slice(0, i))
      i++
      if (i > text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text, speed])

  return (
    <span>
      {disp}
      <span className="inline-block w-1.5 h-3 ml-1 bg-[currentColor] animate-typing-cursor" />
    </span>
  )
}
