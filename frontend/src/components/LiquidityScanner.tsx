import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplet, TrendingUp } from 'lucide-react'
import { api, formatUSD } from '@/lib/api'

interface LiquidityEvent {
  tx_hash: string
  pool: string
  token0: string
  token1: string
  action: 'lp_add' | 'lp_remove'
  amount_usd: number
  block_number: number
  timestamp: string
}

export default function LiquidityScanner() {
  const [events, setEvents] = useState<LiquidityEvent[]>([])

  const loadLiquidity = async () => {
    try {
      const data = await api.liquidityEvents(8)
      if (data && data.length > 0) {
        setEvents(data)
      }
    } catch (err) {
      console.error("Failed to load liquidity events:", err)
    }
  }

  useEffect(() => {
    loadLiquidity()
    const iv = setInterval(loadLiquidity, 15000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)]">
      <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-black/30 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Droplet size={13} className="text-[var(--cyan)] animate-pulse" />
          <span className="font-orbitron text-[12px] font-black tracking-widest text-[var(--cyan)]">
            LIQUIDITY SCANNER
          </span>
        </div>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto feed-scroll select-none flex flex-col gap-1.5">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center font-mono text-[9.5px] text-slate-500">
            SCANNING MOE & AGNI PAIRS...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e, idx) => {
              const isAdd = e.action === 'lp_add'
              const color = isAdd ? '#10B981' : '#EF4444'
              return (
                <motion.div
                  key={e.tx_hash}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-2 py-1.5 rounded bg-black/20 border border-[rgba(255,255,255,0.02)] flex items-center justify-between font-mono text-[10px]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">{e.pool}</span>
                    <span className="text-[8px] text-slate-500">Block #{e.block_number}</span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span 
                      style={{ color }}
                      className="font-black"
                    >
                      {isAdd ? '➕ ADD' : '➖ REMOVE'}
                    </span>
                    <span className="text-white font-bold">{formatUSD(e.amount_usd)}</span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
