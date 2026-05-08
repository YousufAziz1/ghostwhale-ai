import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

export default function AIAvatar({ status }: { status: 'idle' | 'scanning' | 'alert' }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (status !== 'idle') {
      const iv = setInterval(() => setPulse(p => !p), 500)
      return () => clearInterval(iv)
    }
  }, [status])

  const color = status === 'alert' ? 'var(--accent-red)' : status === 'scanning' ? 'var(--accent-2)' : 'var(--accent)'
  const glow  = status === 'alert' ? 'var(--red-glow)' : status === 'scanning' ? 'var(--cyan-glow)' : 'var(--accent-glow)'

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-full border border-[var(--border-subtle)] flex items-center justify-center bg-[var(--bg-card)] overflow-hidden">
        {/* Core Eye */}
        <div 
          className="w-4 h-4 rounded-full animate-blink-eye transition-colors duration-300"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 12px ${glow}, 0 0 24px ${color}`
          }}
        />
        {/* Scanning ring */}
        {pulse && (
          <div 
            className="absolute inset-1 border border-[currentColor] rounded-full animate-ping opacity-20"
            style={{ color }}
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase">GHOSTWHALE-001</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {status === 'alert' ? 'DETECTED' : status === 'scanning' ? 'SCANNING...' : 'ONLINE'}
        </span>
      </div>
    </div>
  )
}
