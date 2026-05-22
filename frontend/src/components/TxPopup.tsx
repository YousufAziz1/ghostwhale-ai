import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ExternalLink, Zap } from 'lucide-react'
import type { Trade } from '@/types'
import { mantleExplorerTx, truncateAddr } from '@/lib/api'

interface TxPopupProps {
  trade: Trade | null
}

export default function TxPopup({ trade }: TxPopupProps) {
  return (
    <AnimatePresence>
      {trade && (
        <motion.div
          key={trade.tx_hash}
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg overflow-hidden backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(0,0,0,0.8) 100%)',
            border: '1px solid rgba(16,185,129,0.4)',
            boxShadow: '0 8px 32px rgba(16,185,129,0.15), 0 0 0 1px rgba(16,185,129,0.3)',
            width: '320px'
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="font-orbitron text-[10px] font-bold tracking-widest text-emerald-400">
              TX CONFIRMED
            </span>
            <span className="ml-auto font-mono text-[9px] text-emerald-400/70">MANTLE L2</span>
          </div>

          {/* Body */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--text-muted)]">ACTION</span>
              <span className="font-mono text-[10px] font-bold text-white">
                {trade.direction} {trade.token}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--text-muted)]">PROFIT</span>
              <span className="font-mono text-[11px] font-bold text-emerald-400">
                +${trade.pnl_usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--text-muted)]">LATENCY</span>
              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <Zap size={10} /> {(Math.random() * 2 + 1).toFixed(2)}s
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[var(--text-muted)]">GAS USED</span>
              <span className="font-mono text-[10px] text-[var(--cyan)]">
                0.000{Math.floor(Math.random() * 800 + 100)} MNT
              </span>
            </div>

            <div className="pt-2 mt-2 flex items-center justify-between" style={{ borderTop: '1px dashed rgba(16,185,129,0.2)' }}>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">HASH</span>
              <a 
                href={mantleExplorerTx(trade.tx_hash || '0x0000000000000000000000000000000000000000')}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[9px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {truncateAddr(trade.tx_hash || '0x0000000000000000000000000000000000000000')} <ExternalLink size={8} />
              </a>
            </div>
          </div>
          
          {/* Progress bar shrinking */}
          <motion.div 
            className="h-0.5 bg-emerald-500"
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: 4, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
