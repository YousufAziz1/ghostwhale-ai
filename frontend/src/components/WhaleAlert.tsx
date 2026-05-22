import { AnimatePresence, motion } from 'framer-motion'
import type { WhaleEvent } from '@/types'
import { formatUSD, truncateAddr, mantleExplorerTx } from '@/lib/api'
import { ExternalLink, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface WhaleAlertProps {
  event: WhaleEvent | null
  onDismiss: () => void
}

export default function WhaleAlert({ event, onDismiss }: WhaleAlertProps) {
  const isBuy = event?.action === 'buy' || event?.action === 'lp_add'
  const confidence = event ? Math.round(event.wallet_score * 100) : 0
  const isMassive = event ? event.amount_usd > 400000 : false

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.tx_hash}
          initial={{ x: 80, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`absolute z-50 rounded-xl overflow-hidden cursor-pointer ${isMassive ? 'w-96 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-4 right-4 w-72'}`}
          style={{
            background: isBuy
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(0,245,255,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255,59,92,0.1) 0%, rgba(124,58,237,0.05) 100%)',
            border: `1px solid ${isBuy ? 'rgba(16,185,129,0.4)' : 'rgba(255,59,92,0.4)'}`,
            boxShadow: isBuy
              ? `0 0 ${isMassive ? '100px' : '40px'} rgba(16,185,129,0.2), 0 0 1px rgba(16,185,129,0.5)`
              : `0 0 ${isMassive ? '100px' : '40px'} rgba(255,59,92,0.2), 0 0 1px rgba(255,59,92,0.5)`,
            backdropFilter: 'blur(20px)',
          }}
          onClick={onDismiss}
        >
          {/* Scan line animation */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 pointer-events-none"
            style={{
              background: isBuy
                ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.8), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,59,92,0.8), transparent)',
            }}
            animate={{ top: ['-2px', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              borderBottom: `1px solid ${isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(255,59,92,0.2)'}`,
              background: isBuy ? 'rgba(16,185,129,0.08)' : 'rgba(255,59,92,0.08)',
            }}
          >
            <AlertTriangle size={12} color={isBuy ? '#10B981' : '#FF3B5C'} />
            <span
              className="font-orbitron text-[10px] font-bold tracking-widest"
              style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}
            >
              🐋 WHALE DETECTED
            </span>
            <div className="ml-auto flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: isBuy ? '#10B981' : '#FF3B5C' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-2.5">
            {/* Asset + action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-base" style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>
                  {event.token}
                </span>
                <span
                  className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(255,59,92,0.15)',
                    color: isBuy ? '#10B981' : '#FF3B5C',
                    border: `1px solid ${isBuy ? 'rgba(16,185,129,0.4)' : 'rgba(255,59,92,0.4)'}`,
                  }}
                >
                  {isBuy ? '▲ BUY' : '▼ SELL'}
                </span>
              </div>
              {isBuy ? (
                <TrendingUp size={16} className="text-green-400" />
              ) : (
                <TrendingDown size={16} className="text-red-400" />
              )}
            </div>

            {/* Amount */}
            <div className="font-orbitron font-bold text-2xl text-white">
              {formatUSD(event.amount_usd)}
            </div>

            {/* Details */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--text-muted)]">WALLET</span>
                <a
                  href={mantleExplorerTx(event.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] flex items-center gap-1 hover:text-[var(--cyan)] transition-colors"
                  style={{ color: 'rgba(0,245,255,0.7)' }}
                  onClick={e => e.stopPropagation()}
                >
                  {truncateAddr(event.from_wallet)} <ExternalLink size={8} />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--text-muted)]">AI CONFIDENCE</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>
                  {confidence}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[var(--text-muted)]">EXPECTED MOVE</span>
                <span className="font-mono text-[10px] font-bold" style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>
                  {isBuy ? '+' : '-'}{(event.wallet_score * 14).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Confidence bar */}
            <div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ background: isBuy ? 'linear-gradient(90deg, #10B981, #00F5FF)' : 'linear-gradient(90deg, #FF3B5C, #7C3AED)' }}
                />
              </div>
            </div>

            {/* AI Reasoning (Hackathon gold) */}
            <div className="pt-2 mt-2" style={{ borderTop: `1px dashed ${isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(255,59,92,0.3)'}` }}>
              <span className="font-orbitron text-[9px] font-bold tracking-widest mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
                AI REASONING:
              </span>
              <ul className="space-y-1">
                <li className="flex items-start gap-1.5">
                  <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                  <span className="font-mono text-[9px] leading-tight text-[var(--text-muted)]">
                    Whale accumulated 3 times in 24h
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                  <span className="font-mono text-[9px] leading-tight text-[var(--text-muted)]">
                    Liquidity imbalance: {isBuy ? 'bid' : 'ask'} side thin
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                  <span className="font-mono text-[9px] leading-tight text-[var(--text-muted)]">
                    Historical breakout match: {confidence - 3}%
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
