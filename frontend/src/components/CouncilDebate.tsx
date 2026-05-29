import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShieldAlert, Award, Radio } from 'lucide-react'
import { api } from '@/lib/api'

interface Agent {
  name: string
  role: string
  description: string
  reputation_score: number
  risk_score: number
  active: number
}

interface Vote {
  agent_name: string
  direction: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  reasoning: string
}

interface CouncilDebateProps {
  activeSignalId: string | null
  activeVotes?: Vote[]
  consensusDirection?: 'BUY' | 'SELL' | 'HOLD'
  consensusConfidence?: number
}

export default function CouncilDebate({ activeSignalId, activeVotes, consensusDirection, consensusConfidence }: CouncilDebateProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await api.councilAgents()
        if (data && data.length > 0) {
          setAgents(data)
        }
      } catch (err) {
        console.error("Failed to load council agents:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
    const iv = setInterval(loadAgents, 15000)
    return () => clearInterval(iv)
  }, [])

  // If we have active votes for a signal, map them; otherwise use default/idle state
  const votesMap = activeVotes ? activeVotes.reduce((acc, v) => {
    acc[v.agent_name] = v
    return acc
  }, {} as Record<string, Vote>) : {}

  const getVoteBadge = (agentName: string) => {
    const vote = votesMap[agentName]
    if (!vote) return <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">IDLE SCANNING</span>
    
    const direction = vote.direction
    const conf = Math.round(vote.confidence * 100)
    
    if (direction === 'BUY') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[rgba(16,185,129,0.15)] text-[#10B981] border border-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)] uppercase">
          🟢 BUY ({conf}%)
        </span>
      )
    } else if (direction === 'SELL') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.3)] uppercase">
          🔴 SELL ({conf}%)
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.3)] uppercase">
          🟡 HOLD ({conf}%)
        </span>
      )
    }
  }

  const getReasoningText = (agentName: string) => {
    const vote = votesMap[agentName]
    if (!vote) return "Awaiting transaction logs. Scanning mempool patterns..."
    return vote.reasoning
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[var(--cyan)] animate-pulse" />
          <span className="font-orbitron text-[12px] font-black tracking-widest text-[var(--cyan)]">
            MULTI-AGENT COUNCIL
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold text-[#A0AEC0] tracking-wider uppercase">
          <Radio size={10} className="text-[#10B981] animate-ping" />
          <span>5 Core Instances Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 feed-scroll">
        {activeVotes && activeVotes.length > 0 && consensusDirection && (
          <div className="p-3 border border-[rgba(0,245,255,0.18)] bg-[rgba(8,11,26,0.55)] rounded-xl flex flex-col gap-1.5 shadow-[0_0_12px_rgba(0,245,255,0.05)] select-none shrink-0">
            <span className="font-orbitron text-[9px] font-black tracking-widest text-[var(--cyan)] uppercase">
              CONSOLIDATED CONSENSUS VERDICT
            </span>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                consensusDirection === 'BUY' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[#10B981]' :
                consensusDirection === 'SELL' ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[#EF4444]' :
                'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[#F59E0B]'
              }`}>
                {consensusDirection}
              </span>
              <span className="font-orbitron text-xs font-black text-white">
                {Math.round((consensusConfidence || 0) * 100)}% CONFIDENCE
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
              <div 
                className={`h-full rounded ${
                  consensusDirection === 'BUY' ? 'bg-[#10B981]' :
                  consensusDirection === 'SELL' ? 'bg-[#EF4444]' :
                  'bg-[#F59E0B]'
                }`} 
                style={{ width: `${(consensusConfidence || 0) * 100}%` }}
              />
            </div>
          </div>
        )}
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-[11px] text-slate-500">
            CONNECTING COUNCIL CORES...
          </div>
        ) : (
          agents.map((agent) => {
            const hasVote = !!votesMap[agent.name]
            return (
              <motion.div
                key={agent.name}
                className="p-3 border border-[rgba(255,255,255,0.03)] bg-[rgba(8,11,26,0.35)] rounded-xl flex flex-col gap-2 relative overflow-hidden"
                style={{
                  borderColor: hasVote ? 'rgba(0,245,255,0.1)' : 'rgba(255,255,255,0.03)',
                  boxShadow: hasVote ? '0 0 15px rgba(0,245,255,0.05)' : 'none'
                }}
                layout
              >
                {/* Header: Name & Role & Vote */}
                <div className="flex justify-between items-start select-none">
                  <div>
                    <h4 className="font-orbitron text-[12px] font-black text-slate-100 tracking-wide">
                      {agent.name}
                    </h4>
                    <span className="font-mono text-[9px] text-[var(--purple)] font-bold uppercase tracking-wider">
                      {agent.role}
                    </span>
                  </div>
                  <div>
                    {getVoteBadge(agent.name)}
                  </div>
                </div>

                {/* Reasoning text (Plain-English Argument) */}
                <div className="font-mono text-[11px] text-slate-400 leading-normal italic py-1 border-l-2 border-[var(--border)] pl-2">
                  "{getReasoningText(agent.name)}"
                </div>

                {/* Telemetry Footer: Reputation & Risk */}
                <div className="flex gap-4 font-mono text-[9px] text-[#A0AEC0] mt-1 pt-1.5 border-t border-[rgba(255,255,255,0.02)] select-none">
                  <div className="flex-1 flex items-center gap-1.5">
                    <Award size={10} className="text-amber-500" />
                    <span>REP:</span>
                    <span className="font-bold text-amber-500">{Math.round(agent.reputation_score)}</span>
                    <div className="flex-1 bg-slate-800 h-1 rounded overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded" 
                        style={{ width: `${(agent.reputation_score / 1000) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={10} className="text-[var(--red)]" />
                    <span>RISK:</span>
                    <span className="font-bold text-[var(--red)]">{Math.round(agent.risk_score)}%</span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
