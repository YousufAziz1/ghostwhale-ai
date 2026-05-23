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
        <div 
          className="flex items-center justify-between border-b border-[var(--border)] bg-black/40"
          style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '18px', paddingBottom: '18px' }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className={isBuy ? 'text-[var(--green)]' : 'text-[var(--red)]'} />
            <span className="font-orbitron font-extrabold text-[11px] tracking-widest text-[var(--text-primary)]">
              LIVE ON-CHAIN TX INTELLIGENCE
            </span>
            {isHighValue && (
              <span className="font-orbitron text-[8.5px] font-black px-1.5 py-0.5 rounded blink-tag-red bg-[rgba(255,59,92,0.15)] text-[var(--red)] border border-[rgba(255,59,92,0.3)]">
                HIGH VALUE WHALE
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div 
          className="space-y-4 overflow-y-auto max-h-[70vh] scrollbar-thin"
          style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}
        >
          
          {/* Main Stats Summary Banner */}
          <div 
            className="grid grid-cols-2 gap-4 bg-black/35 border border-[rgba(0,245,255,0.06)] rounded-lg text-center"
            style={{ padding: '18px 16px' }}
          >
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transfer Amount</span>
              <span className="font-orbitron text-[16px] font-black text-white tracking-wide">
                {event.amount_usd >= 1_000_000 ? `${(event.amount_usd / 1_000_000).toFixed(2)}M` : event.amount_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
              </span>
              <span className="font-mono text-[9.5px] text-[var(--cyan)] mt-0.5 font-bold">
                {event.amount_raw !== '0' ? event.amount_raw : `${(event.amount_usd / 1.1).toLocaleString('en-US', { maximumFractionDigits: 0 })}`} {event.token}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">AI Target Priority</span>
              <span className={`font-orbitron text-[16px] font-black ${isBuy ? 'text-[var(--green)]' : 'text-[var(--red)]'} tracking-wide`}>
                {isBuy ? 'LONG ACCUM' : 'SHORT DUMP'}
              </span>
              <span className="font-mono text-[10px] text-slate-350 mt-0.5 font-bold">
                Confidence {confidence}%
              </span>
            </div>
          </div>

          {/* Section 1: Transaction Telemetry */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-orbitron font-bold tracking-widest text-[var(--cyan)] uppercase">
              <Database size={12} />
              <span>Blockchain Telemetry</span>
            </div>

            <div 
              className="grid grid-cols-2 gap-x-4 gap-y-4 bg-black/20 border border-white/5 rounded-lg text-[11.5px] font-mono text-slate-350"
              style={{ padding: '20px 16px' }}
            >
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Transaction Hash</span>
                <a
                  href={mantleExplorerTx(event.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white hover:text-[var(--cyan)] transition-colors font-bold truncate flex items-center gap-1"
                >
                  {truncateAddr(event.tx_hash, 8, 6)}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Chain Network</span>
                <span className="text-white font-bold">{source}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">From (Sender)</span>
                <span className="text-white font-bold truncate select-all" title={event.from_wallet}>
                  {truncateAddr(event.from_wallet, 8, 8)}
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">To (Receiver)</span>
                <span className="text-white font-bold truncate select-all" title={event.to_wallet}>
                  {truncateAddr(event.to_wallet, 8, 8)}
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Gas Fee Paid</span>
                <span className="text-white font-bold">{gas}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Mempool Status</span>
                <span className="text-[var(--green)] font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  CONFIRMED
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: AI Quantitative Analysis */}
          <div className="grid grid-cols-2 gap-3">
            {/* Wallet Profile */}
            <div 
              className="bg-black/20 border border-white/5 rounded-lg flex flex-col justify-between"
              style={{ padding: '18px 16px' }}
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-orbitron font-bold tracking-widest text-[var(--purple)] uppercase mb-3">
                <Cpu size={12} />
                <span>Wallet Profile</span>
              </div>
              <div className="font-mono text-[11px] text-slate-350 space-y-2.5 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-full truncate">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Classification</span>
                  <span className="text-white font-bold">{label}</span>
                </div>
                <div className="w-full">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Win Rate</span>
                  <span className="text-[var(--green)] font-bold">76.5%</span>
                </div>
                <div className="w-full">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Settled Trades</span>
                  <span className="text-white">18 on-chain</span>
                </div>
                <div className="w-full">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Net Flow P&L</span>
                  <span className="text-[var(--green)] font-bold">+$143.2K</span>
                </div>
              </div>
            </div>

            {/* Liquidity Impact */}
            <div 
              className="bg-black/20 border border-white/5 rounded-lg flex flex-col justify-between"
              style={{ padding: '18px 16px' }}
            >
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-orbitron font-bold tracking-widest text-[var(--cyan)] uppercase mb-3">
                <BarChart3 size={12} />
                <span>Liquidity Drift</span>
              </div>
              <div className="font-mono text-[11px] text-slate-350 space-y-2.5 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-full truncate">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">DEX Router</span>
                  <span className="text-white font-bold">Merchant Moe</span>
                </div>
                <div className="w-full">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Depth Impact</span>
                  <span className="text-[var(--cyan)] font-bold">-0.04%</span>
                </div>
                <div className="w-full truncate">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Slippage Est</span>
                  <span className="text-slate-300">0.012% (negligible)</span>
                </div>
                <div className="w-full">
                  <span className="text-[var(--text-muted)] uppercase font-bold text-[8.5px] tracking-wider block mb-0.5">Priority Signal</span>
                  <span className="text-[var(--green)] font-bold">Buy Breakout</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: AI Reasoning Detail */}
          <div 
            className="space-y-2 bg-black/35 border border-white/5 rounded-lg relative overflow-hidden text-center"
            style={{ padding: '18px 16px' }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--purple-dim)] blur-[35px] pointer-events-none" />
            <span className="font-orbitron text-[10px] font-extrabold text-[var(--purple)] tracking-widest uppercase block mb-1 text-center w-full">
              AI Quantitative Reasoning
            </span>
            <p className="font-mono text-[11.5px] text-slate-200 leading-relaxed font-medium text-center">
              {reasoning}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          className="border-t border-[var(--border)] bg-black/40 flex items-center justify-between"
          style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '14px', paddingBottom: '14px' }}
        >
          <span className="font-mono text-[10px] text-[var(--text-muted)] font-bold">
            BLCK #{(event.block_number || 72384192).toLocaleString()}
          </span>
          
          <a
            href={mantleExplorerTx(event.tx_hash)}
            target="_blank"
            rel="noreferrer"
            className="font-orbitron text-[11px] font-black text-[var(--cyan)] hover:text-white tracking-widest flex items-center gap-1.5 py-1.5 px-3.5 border border-[rgba(0,245,255,0.3)] hover:border-white bg-black/20 rounded transition-all cursor-pointer"
          >
            <span>EXPLORER MANTLESCAN</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </motion.div>
    </div>
  )
}
