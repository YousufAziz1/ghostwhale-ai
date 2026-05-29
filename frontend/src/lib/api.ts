// GhostWhale AI — API helpers
import type { Signal, WhaleEvent, Trade, AgentStats, AgentIdentity, PnLPoint } from '@/types'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function apiFetch<T>(path: string): Promise<T> {
  let baseUrl = BASE
  // Auto-append /api if the user provided a raw domain in Vercel env vars
  if (baseUrl.startsWith('http') && !baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`
  }
  const res = await fetch(`${baseUrl}${path}`)
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  signals:       (limit = 20) => apiFetch<Signal[]>(`/signals?limit=${limit}`),
  whaleEvents:   (limit = 50) => apiFetch<WhaleEvent[]>(`/whale-events?limit=${limit}`),
  trades:        (limit = 50) => apiFetch<Trade[]>(`/trades?limit=${limit}`),
  stats:         ()           => apiFetch<AgentStats>('/stats'),
  identity:      ()           => apiFetch<AgentIdentity>('/agent-identity'),
  pnlTimeseries: ()           => apiFetch<PnLPoint[]>('/pnl-timeseries'),
  health:        ()           => apiFetch<{ status: string; rpc: { connected: boolean; chain_id?: number; latest_block?: number } }>('/health'),
  
  // New Multi-Agent Council & Liquidity scanner endpoints
  councilAgents:   ()           => apiFetch<any[]>('/council/agents'),
  councilVotes:    (signalId: string) => apiFetch<any[]>(`/council/votes?signal_id=${signalId}`),
  liquidityEvents: (limit = 30) => apiFetch<any[]>(`/liquidity-events?limit=${limit}`),

  // Axios-like fallback compatibility
  get:           <T>(path: string) => apiFetch<T>(path),
  defaults:      { baseURL: BASE }
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

export function formatPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`
}

export function truncateAddr(addr: string, start = 6, end = 4): string {
  if (!addr || addr.length < start + end + 3) return addr
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function mantleExplorerTx(txHash: string): string {
  return `https://mantlescan.xyz/tx/${txHash}`
}
