'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface PlayerStatsEntry {
  id: number
  timestamp: string
  totalPlayers: number
  maxPlayers: number
  onlineServers: number
  totalServers: number
}

interface Totals {
  userCount: number
  serverCount: number
  nodeCount: number
  imageCount: number
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-4">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{sub}</p>
    </div>
  )
}

export default function PlayerStatsPage() {
  useAuth({ require: true, adminOnly: true })
  const [totals, setTotals] = useState<Totals | null>(null)
  const [stats, setStats] = useState<PlayerStatsEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('7d')

  function load(r: string) {
    setLoading(true)
    fetch(`/api/admin/analytics?range=${r}`)
      .then(res => res.json())
      .then(d => {
        setTotals(d.totals || null)
        setStats(d.playerStats || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(range) }, [range])

  const latest = stats[stats.length - 1]

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Player Statistics</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Player counts across all Minecraft servers</p>
          </div>
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
            {(['7d', '14d', '30d'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${range === r ? 'bg-white dark:bg-white/[0.08] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Current Players" value={latest?.totalPlayers ?? 0} sub="Online now" />
          <StatCard label="Max Capacity" value={latest?.maxPlayers ?? 0} sub="Total player slots" />
          <StatCard label="Online Servers" value={latest?.onlineServers ?? 0} sub="Running instances" />
          <StatCard label="Total Servers" value={totals?.serverCount ?? 0} sub="All instances" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : stats.length === 0 ? (
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-6 py-12 text-center">
            <p className="text-sm text-neutral-500">No player data collected yet.</p>
            <p className="text-xs text-neutral-400 mt-1">Data is collected automatically from online Minecraft servers.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 px-4 py-3 border-b border-neutral-200 dark:border-white/5">
              <p className="text-xs font-medium text-neutral-500">Historical data — last {range}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                  <tr>
                    {['Time', 'Players', 'Capacity', 'Online Servers', 'Total Servers'].map(h => (
                      <th key={h} className="py-3 pl-6 pr-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                  {[...stats].reverse().slice(0, 50).map(entry => (
                    <tr key={entry.id}>
                      <td className="py-3 pl-6 pr-3 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-neutral-800 dark:text-white">{entry.totalPlayers}</td>
                      <td className="px-3 py-3 text-sm text-neutral-600 dark:text-neutral-300">{entry.maxPlayers}</td>
                      <td className="px-3 py-3 text-sm text-neutral-600 dark:text-neutral-300">{entry.onlineServers}</td>
                      <td className="px-3 py-3 text-sm text-neutral-600 dark:text-neutral-300">{entry.totalServers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  )
}
