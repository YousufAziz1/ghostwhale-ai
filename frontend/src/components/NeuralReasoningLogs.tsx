import { useEffect, useState } from 'react'

const NEURAL_REASONING_MOCKS = [
  'Specific deep analysis to checks for anomalies...',
  'Neural cross-referencing for wallet history...',
  'Predictive target: Open position moment...',
  'Predictive: Triggering MNT/USDT long analysis...',
  'Analyzing contract bytecode functions...',
  'Risk metrics calibration complete.',
  'Checking pool reserves: Merchant Moe...',
  'Smart money transaction confirmed.',
]

export default function NeuralReasoningLogs() {
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    setLogs(NEURAL_REASONING_MOCKS.slice(0, 4))
    const iv = setInterval(() => {
      setLogs(prev => {
        const nextLog = NEURAL_REASONING_MOCKS[Math.floor(Math.random() * NEURAL_REASONING_MOCKS.length)]
        return [nextLog, ...prev.slice(0, 3)]
      })
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-black/30 shrink-0">
        <span className="font-orbitron text-[9px] font-bold tracking-widest text-[#A78BFA]">
          NEURAL REASONING LOGS
        </span>
      </div>
      <div className="flex-1 p-3 overflow-hidden flex flex-col justify-around font-mono text-[9px] text-slate-400 select-none">
        {logs.map((log, idx) => (
          <div key={idx} className="line-clamp-1 leading-normal">
            <span className="text-[var(--purple)] mr-1.5">•</span>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}
