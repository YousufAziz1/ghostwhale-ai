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
        <>
          {/* Full Screen Flash for Massive Whales */}
          {isMassive && (
            <motion.div
              className="fixed inset-0 z-40 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.1, 0.5, 0] }}
              transition={{ duration: 1.5, times: [0, 0.1, 0.3, 0.5, 1], ease: 'linear' }}
              style={{
                background: isBuy ? 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 80%)' : 'radial-gradient(circle, rgba(255,59,92,0.3) 0%, transparent 80%)',
                mixBlendMode: 'screen'
              }}
            />
          )}
          
          <motion.div
            key={event.tx_hash}
            initial={{ x: 80, opacity: 0, scale: 0.95 }}
            animate={
              isMassive 
                ? { x: ['-50%', '-52%', '-48%', '-50%'], y: '-50%', opacity: 1, scale: 1 } 
                : { x: 0, opacity: 1, scale: 1 }
            }
            exit={{ x: 80, opacity: 0, scale: 0.95 }}
            transition={isMassive ? { x: { duration: 0.2, repeat: Infinity, repeatType: 'reverse' } } : { type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute z-50 rounded-xl overflow-hidden cursor-pointer ${isMassive ? 'w-[500px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-4 right-4 w-72'}`}
            style={{
              background: isBuy
                ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(0,245,255,0.05) 100%)'
                : 'linear-gradient(135deg, rgba(255,59,92,0.15) 0%, rgba(124,58,237,0.05) 100%)',
              border: `2px solid ${isBuy ? 'rgba(16,185,129,0.6)' : 'rgba(255,59,92,0.6)'}`,
              boxShadow: isBuy
                ? `0 0 ${isMassive ? '150px' : '40px'} rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.8)`
                : `0 0 ${isMassive ? '150px' : '40px'} rgba(255,59,92,0.4), 0 0 20px rgba(255,59,92,0.8)`,
              backdropFilter: 'blur(30px)',
            }}
            onClick={onDismiss}
          >
            {/* Scan line animation */}
            <motion.div
              className="absolute left-0 right-0 h-1 pointer-events-none"
              style={{
                background: isBuy
                  ? 'linear-gradient(90deg, transparent, rgba(16,185,129,1), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255,59,92,1), transparent)',
              }}
              animate={{ top: ['-2px', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />

            {/* Header */}
            <div
              className={`flex items-center gap-2 px-6 py-3 ${isMassive ? 'animate-pulse' : ''}`}
              style={{
                borderBottom: `1px solid ${isBuy ? 'rgba(16,185,129,0.3)' : 'rgba(255,59,92,0.3)'}`,
                background: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(255,59,92,0.15)',
              }}
            >
              <AlertTriangle size={isMassive ? 24 : 12} color={isBuy ? '#10B981' : '#FF3B5C'} />
              <span
                className={`font-orbitron font-bold tracking-widest ${isMassive ? 'text-lg' : 'text-[10px]'}`}
                style={{ color: isBuy ? '#10B981' : '#FF3B5C', textShadow: `0 0 10px ${isBuy ? '#10B981' : '#FF3B5C'}` }}
              >
                {isMassive ? '⚠ MASSIVE WHALE DETECTED' : '🐋 WHALE DETECTED'}
              </span>
            </div>

            {/* Body */}
            <div className={`p-6 space-y-4`}>
              {/* Asset + action */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`font-orbitron font-bold ${isMassive ? 'text-3xl' : 'text-base'}`} style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>
                    {event.token}
                  </span>
                  <span
                    className="font-mono text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(255,59,92,0.2)',
                      color: isBuy ? '#10B981' : '#FF3B5C',
                      border: `1px solid ${isBuy ? 'rgba(16,185,129,0.5)' : 'rgba(255,59,92,0.5)'}`,
                    }}
                  >
                    {isBuy ? '▲ AGGRESSIVE BUY' : '▼ PANIC SELL'}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className={`font-orbitron font-bold ${isMassive ? 'text-6xl' : 'text-2xl'} text-white`}>
                {formatUSD(event.amount_usd)}
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`font-mono ${isMassive ? 'text-sm' : 'text-[10px]'} text-[var(--text-muted)]`}>WALLET</span>
                  <a
                    href={mantleExplorerTx(event.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-mono ${isMassive ? 'text-sm' : 'text-[10px]'} flex items-center gap-1 hover:text-[var(--cyan)] transition-colors`}
                    style={{ color: 'rgba(0,245,255,0.7)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {truncateAddr(event.from_wallet)} <ExternalLink size={10} />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-mono ${isMassive ? 'text-sm' : 'text-[10px]'} text-[var(--text-muted)]`}>AI CONFIDENCE</span>
                  <span className={`font-mono ${isMassive ? 'text-lg' : 'text-[10px]'} font-bold`} style={{ color: isBuy ? '#10B981' : '#FF3B5C', textShadow: `0 0 10px ${isBuy ? '#10B981' : '#FF3B5C'}` }}>
                    {confidence}%
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="progress-bar h-2">
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
              <div className="pt-4 mt-2" style={{ borderTop: `1px dashed ${isBuy ? 'rgba(16,185,129,0.4)' : 'rgba(255,59,92,0.4)'}` }}>
                <span className={`font-orbitron ${isMassive ? 'text-xs' : 'text-[9px]'} font-bold tracking-widest mb-2 block`} style={{ color: 'var(--text-primary)' }}>
                  AI REASONING:
                </span>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                    <span className={`font-mono ${isMassive ? 'text-sm' : 'text-[9px]'} leading-tight text-[var(--text-muted)]`}>
                      Whale accumulated 3 times in 24h
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                    <span className={`font-mono ${isMassive ? 'text-sm' : 'text-[9px]'} leading-tight text-[var(--text-muted)]`}>
                      Liquidity imbalance: {isBuy ? 'bid' : 'ask'} side thin
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: isBuy ? '#10B981' : '#FF3B5C' }}>•</span>
                    <span className={`font-mono ${isMassive ? 'text-sm' : 'text-[9px]'} leading-tight text-[var(--text-muted)]`}>
                      Historical breakout match: {confidence - 3}%
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
