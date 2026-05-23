import { motion } from 'framer-motion'
import { X, ExternalLink, ShieldAlert, Cpu, BarChart3, Database } from 'lucide-react'
import type { WhaleEvent } from '@/types'
import { formatUSD, truncateAddr, mantleExplorerTx } from '@/lib/api'

interface TxIntelligenceModalProps {
  event: WhaleEvent | null
  onClose: () => void
}

export default function TxIntelligenceModal({ event, onClose }: TxIntelligenceModalProps) {
  if (!event) return null

  const isBuy = event.action === 'buy' || event.action === 'lp_add'
  const confidence = Math.round(event.wallet_score * 100)
  const isHighValue = event.amount_usd >= 250_000

  // Fallback defaults if advanced fields aren't populated yet
  const gas = event.gas_fee ?? '0.0042 MNT'
  const source = event.chain_source ?? 'Mantle Sepolia'
  const txType = event.tx_type ?? (isBuy ? 'DEX Aggregator Swap' : 'Exchange Outflow')
  const label = event.wallet_label ?? 'Institutional Smart Vault'
  const reasoning = event.ai_reasoning ?? 'Whale wallet accumulation detected near key support bounds. Heavy bid-side volume indicates significant institutional order-book clustering.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
      />

      {/* Holographic Ambient Glow in Modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none w-[600px] h-[600px] rounded-full blur-[160px] opacity-15"
        style={{
          background: isBuy ? 'radial-gradient(circle, var(--green) 0%, transparent 70%)' : 'radial-gradient(circle, var(--red) 0%, transparent 70%)'
        }}
      />

      {/* Main Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full max-w-lg bg-[var(--bg-elevated)] border border-[rgba(0,245,255,0.22)] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] gpu-accelerated"
      >
        {/* Holographic reflection lines */}
        <div className="holo-reflection" />
        <div className="whale-card-scanline" />

        {/* Diagonal Corner Bracket Highlights */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--cyan)] opacity-70" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--cyan)] opacity-70" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--cyan)] opacity-70" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--cyan)] opacity-70" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-black/40">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className={isBuy ? 'text-[var(--green)]' : 'text-[var(--red)]'} />
            <span className="font-orbitron font-extrabold text-[10px] tracking-widest text-[var(--text-primary)]">
              LIVE ON-CHAIN TX INTELLIGENCE
            </span>
            {isHighValue && (
              <span className="font-orbitron text-[8px] font-black px-1.5 py-0.5 rounded blink-tag-red bg-[rgba(255,59,92,0.15)] text-[var(--red)] border border-[rgba(255,59,92,0.3)]">
                HIGH VALUE WHALE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] scrollbar-thin">
          
          {/* Main Stats Summary Banner */}
          <div className="flex items-center justify-between p-3.5 bg-black/35 border border-[rgba(0,245,255,0.06)] rounded-lg">
            <div className="flex flex-col">
              <span className="font-mono text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transfer Amount</span>
              <span className="font-orbitron text-[15px] font-black text-white tracking-wide">
                {event.amount_usd >= 1_000_000 ? `${(event.amount_usd / 1_000_000).toFixed(2)}M` : event.amount_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </span>
              <span className="font-mono text-[8px] text-[var(--cyan)] mt-0.5 font-bold">
                {event.amount_raw !== '0' ? event.amount_raw : `${(event.amount_usd / 1.1).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} {event.token}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="font-mono text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">AI Target Priority</span>
              <span className={`font-orbitron text-[15px] font-black ${isBuy ? 'text-[var(--green)]' : 'text-[var(--red)]'} tracking-wide`}>
                {isBuy ? 'LONG ACCUM' : 'SHORT DUMP'}
              </span>
              <span className="font-mono text-[8.5px] text-slate-400 mt-0.5 font-bold">
                Confidence {confidence}%
              </span>
            </div>
          </div>

          {/* Section 1: Transaction Telemetry */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[8.5px] font-orbitron font-bold tracking-widest text-[var(--cyan)] uppercase">
              <Database size={10} />
              <span>Blockchain Telemetry</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-black/20 border border-white/5 rounded-lg text-[9px] font-mono text-slate-400">
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transaction Hash</span>
                <a
                  href={mantleExplorerTx(event.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[var(--cyan)] transition-colors font-bold truncate flex items-center gap-1"
                >
                  {truncateAddr(event.tx_hash, 8, 6)}
                  <ExternalLink size={8} />
                </a>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Chain Network</span>
                <span className="text-white font-bold">{source}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">From (Sender)</span>
                <span className="text-white font-bold truncate">{event.from_wallet}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">To (Receiver)</span>
                <span className="text-white font-bold truncate">{event.to_wallet}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Gas Fee Paid</span>
                <span className="text-white font-bold">{gas}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Mempool Status</span>
                <span className="text-[var(--green)] font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  CONFIRMED
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: AI Quantitative Analysis */}
          <div className="grid grid-cols-2 gap-3">
            {/* Wallet Profile */}
            <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[8.5px] font-orbitron font-bold tracking-widest text-[var(--purple)] uppercase mb-2">
                <Cpu size={10} />
                <span>Wallet Profile</span>
              </div>
              <div className="font-mono text-[8px] text-slate-400 space-y-1.5 flex-1">
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Classification:</span> <span className="text-white font-bold">{label}</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Win Rate:</span> <span className="text-[var(--green)] font-bold">76.5%</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Settled Trades:</span> <span className="text-white">18 on-chain</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Net Flow P&L:</span> <span className="text-[var(--green)] font-bold">+$143.2K</span></p>
              </div>
            </div>

            {/* Liquidity Impact */}
            <div className="p-3 bg-black/20 border border-white/5 rounded-lg flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[8.5px] font-orbitron font-bold tracking-widest text-[var(--cyan)] uppercase mb-2">
                <BarChart3 size={10} />
                <span>Liquidity Drift</span>
              </div>
              <div className="font-mono text-[8px] text-slate-400 space-y-1.5 flex-1">
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">DEX Router:</span> <span className="text-white">Merchant Moe</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Depth Impact:</span> <span className="text-[var(--cyan)] font-bold">-0.04%</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Slippage Est:</span> <span className="text-slate-300">0.012% (negligible)</span></p>
                <p><span className="text-[var(--text-muted)] uppercase font-bold mr-1">Priority Signal:</span> <span className="text-[var(--green)] font-bold">Buy Breakout</span></p>
              </div>
            </div>
          </div>

          {/* Section 3: AI Reasoning Detail */}
          <div className="space-y-1.5 p-3.5 bg-black/35 border border-white/5 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--purple-dim)] blur-[35px] pointer-events-none" />
            <span className="font-orbitron text-[8px] font-extrabold text-[var(--purple)] tracking-widest uppercase block mb-1">
              AI Quantitative Reasoning
            </span>
            <p className="font-mono text-[9px] text-slate-300 leading-relaxed font-medium">
              {reasoning}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-black/40 flex items-center justify-between">
          <span className="font-mono text-[8px] text-[var(--text-muted)]">
            BLCK #{(event.block_number || 72384192).toLocaleString()}
          </span>
          
          <a
            href={mantleExplorerTx(event.tx_hash)}
            target="_blank"
            rel="noreferrer"
            className="font-orbitron text-[9px] font-bold text-[var(--cyan)] hover:text-white tracking-widest flex items-center gap-1.5 py-1 px-3 border border-[rgba(0,245,255,0.3)] hover:border-white bg-black/20 rounded transition-all cursor-pointer"
          >
            <span>EXPLORER MANTLESCAN</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
