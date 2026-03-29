'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/layout/PanelLayout'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface AnalyticsData {
  servers: {
    total: number
    suspended: number
    installing: number
    totalRamMb: number
    totalCpuPct: number
    totalStorageGb: number
    topImages: { name: string | null; count: number }[]
    topServers: { name: string; uuid: string; memory: number; cpu: number; storage: number; owner: string; image: string; suspended: boolean }[]
  }
  nodes: {
    id: number
    name: string
    address: string
    port: number
    online: boolean
    serverCount: number
    ram: number
    cpu: number
    disk: number
    versionRelease?: string | null
  }[]
  activity: {
    totalUsers: number
    adminCount: number
    totalImages: number
    loginsByDay: Record<string, number>
    recentLogins: { userId: number; ipAddress?: string | null; timestamp: string }[]
  }
}

type Tab = 'servers' | 'nodes' | 'activity'

function StatCard({ label, value, sub, subClass }: { label: string; value: string | number; sub: string; subClass?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-4">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{value}</p>
      <p className={`text-xs mt-1 ${subClass || 'text-neutral-500'}`}>{sub}</p>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#3b82f6'
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
        <span className="truncate max-w-[60%] font-medium">{label}</span>
        <span className="shrink-0 tabular-nums">{value.toLocaleString()} <span className="text-neutral-400">({max > 0 ? pct + '%' : '—'})</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-white/5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${max > 0 ? pct : 0}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('servers')
  const [refreshing, setRefreshing] = useState(false)
  const isDark = useRef(false)

  useEffect(() => {
    isDark.current = document.documentElement.classList.contains('dark')
  }, [])

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData(d)
      if (!loading) showToast('Analytics refreshed', 'success')
    } catch {
      showToast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loading, showToast])

  useEffect(() => { load() }, [])

  const textColor = isDark.current ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const gridColor = isDark.current ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const tabClass = (t: Tab) =>
    `px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2 ${tab === t
      ? 'border-neutral-800 dark:border-white text-neutral-800 dark:text-white'
      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Analytics</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Live data from the database and connected daemons.</p>
          </div>
          <button onClick={load} disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm font-medium transition disabled:opacity-60">
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="flex gap-0.5 border-b border-neutral-200 dark:border-neutral-700/40 mb-6">
          <button onClick={() => setTab('servers')} className={tabClass('servers')}>Servers</button>
          <button onClick={() => setTab('nodes')} className={tabClass('nodes')}>Nodes</button>
          <button onClick={() => setTab('activity')} className={tabClass('activity')}>Activity</button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-neutral-400">
            <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading analytics…</span>
          </div>
        ) : !data ? null : (
          <>
            {tab === 'servers' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total servers" value={data.servers.total}
                    sub={data.servers.suspended > 0 ? `${data.servers.suspended} suspended` : 'none suspended'}
                    subClass={data.servers.suspended > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-500'} />
                  <StatCard label="Allocated RAM" value={data.servers.totalRamMb >= 1024 ? `${(data.servers.totalRamMb / 1024).toFixed(1)} GB` : `${data.servers.totalRamMb} MB`} sub="across all servers" />
                  <StatCard label="Allocated CPU" value={`${data.servers.totalCpuPct}%`} sub="total allocation" />
                  <StatCard label="Allocated disk" value={`${data.servers.totalStorageGb} GB`} sub="total allocation" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white mb-4">Images in use</p>
                    {data.servers.topImages.length ? (
                      <div className="space-y-3">
                        {data.servers.topImages.map((img, i) => (
                          <BarRow key={i} label={img.name || 'Unknown'} value={img.count} max={data.servers.topImages[0].count} />
                        ))}
                      </div>
                    ) : <p className="text-sm text-neutral-400">No servers yet.</p>}
                  </div>

                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white">Highest allocated servers</p>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-white/5">
                      {data.servers.topServers.length ? data.servers.topServers.map(sv => (
                        <div key={sv.uuid} className="flex items-center gap-4 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate font-medium">{sv.name}</p>
                            <p className="text-xs text-neutral-400">{sv.owner} · {sv.image}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                            <span>{sv.memory} MB</span>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <span>{sv.cpu}%</span>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <span>{sv.storage} GB</span>
                          </div>
                          {sv.suspended && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-md shrink-0">Suspended</span>}
                        </div>
                      )) : <p className="px-5 py-4 text-sm text-neutral-400">No servers.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'nodes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Nodes" value={data.nodes.length} sub="configured" />
                  <StatCard label="Online" value={data.nodes.filter(n => n.online).length} sub="reachable" subClass="text-emerald-600 dark:text-emerald-400" />
                  <StatCard label="Offline" value={data.nodes.filter(n => !n.online).length} sub="unreachable" subClass={data.nodes.some(n => !n.online) ? 'text-red-500 dark:text-red-400' : 'text-neutral-500'} />
                </div>
                {data.nodes.length ? data.nodes.map(node => (
                  <div key={node.id} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${node.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-white">{node.name}</p>
                          <p className="text-xs text-neutral-400 font-mono">{node.address}:{node.port}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {node.online && node.versionRelease && (
                          <span className="font-mono bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-2 py-0.5 rounded-md">{node.versionRelease}</span>
                        )}
                        <span>{node.serverCount} server{node.serverCount !== 1 ? 's' : ''}</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${node.online ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                          {node.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">RAM limit</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{node.ram >= 1024 ? `${(node.ram / 1024).toFixed(1)} GB` : `${node.ram} MB`}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">CPU limit</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{node.cpu}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Disk limit</p>
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{node.disk} GB</p>
                      </div>
                    </div>
                  </div>
                )) : <p className="text-sm text-neutral-400">No nodes configured.</p>}
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Users" value={data.activity.totalUsers}
                    sub={`${data.activity.adminCount} admin${data.activity.adminCount !== 1 ? 's' : ''}`} />
                  <StatCard label="Images installed" value={data.activity.totalImages} sub="in library" />
                  <StatCard label="Logins (30d)" value={Object.values(data.activity.loginsByDay).reduce((a, b) => a + b, 0)} sub="total logins" />
                  <StatCard label="Daily avg" value={Math.round(Object.values(data.activity.loginsByDay).reduce((a, b) => a + b, 0) / 30)} sub="logins per day" />
                </div>

                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                  <p className="text-sm font-medium text-neutral-800 dark:text-white mb-4">Logins — last 30 days</p>
                  <div style={{ height: 200 }}>
                    <Bar
                      data={{
                        labels: Object.keys(data.activity.loginsByDay).map(d => d.slice(5)),
                        datasets: [{
                          data: Object.values(data.activity.loginsByDay),
                          backgroundColor: 'rgba(59,130,246,0.5)',
                          borderColor: '#3b82f6',
                          borderWidth: 1,
                          borderRadius: 4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
                          y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, min: 0 },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden shadow-sm">
                  <div className="bg-neutral-50 dark:bg-neutral-800/20 px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white">Recent logins</p>
                  </div>
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                      <tr>
                        {['User ID', 'IP Address', 'Time'].map(h => (
                          <th key={h} className="py-3 pl-5 pr-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                      {data.activity.recentLogins.length ? data.activity.recentLogins.map((l, i) => (
                        <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition">
                          <td className="px-5 py-3 text-xs font-mono text-neutral-500">#{l.userId}</td>
                          <td className="px-5 py-3 text-xs font-mono text-neutral-600 dark:text-neutral-400">{l.ipAddress || 'Unknown'}</td>
                          <td className="px-5 py-3 text-xs text-neutral-500">{new Date(l.timestamp).toLocaleString()}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="px-5 py-5 text-center text-sm text-neutral-400">No login history.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
