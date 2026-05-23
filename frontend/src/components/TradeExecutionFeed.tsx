export default function TradeExecutionFeed() {
  const feeds = [
    { time: 'Nov 15, 23:00', pair: 'BTC/USDT', ago: '37m ago', color: 'var(--green)' },
    { time: 'Nov 20, 23:00', pair: 'ETH/USDT', ago: '2d ago', color: 'var(--red)' },
    { time: 'Nov 22, 23:00', pair: 'MNT/USDT', ago: '20d ago', color: 'var(--green)' },
    { time: 'Nov 25, 23:00', pair: 'MNT/USDT', ago: '10d ago', color: 'var(--green)' },
    { time: 'Nov 28, 23:00', pair: 'MOE/USDT', ago: '30d ago', color: 'var(--red)' }
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-black/30 shrink-0">
        <span className="font-orbitron text-[9px] font-bold tracking-widest text-[var(--cyan)]">
          TRADE EXECUTION FEED
        </span>
      </div>
      <div className="flex-1 p-3 overflow-hidden flex flex-col justify-around font-mono text-[9px]">
        {feeds.map((f, idx) => (
          <div key={idx} className="flex justify-between items-center text-slate-400">
            <span>{f.time}</span>
            <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: f.color }} />
              {f.pair}
            </span>
            <span className="text-[8px] text-[var(--text-muted)]">{f.ago}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
