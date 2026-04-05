'use client'

import { RefreshCw , Loader2} from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Tab = 'servers' | 'nodes' | 'activity' | 'playerstats'

interface AnalyticsData {
  servers: {
    total: number
    suspended: number
    totalRamMb: number
    totalCpuPct: number
    totalStorageGb: number
    topImages: { name: string; count: number }[]
    topServers: { name: string; owner: string; image: string; memory: number; cpu: number; storage: number; suspended: boolean }[]
  }
  nodes: {
    name: string; address: string; port: number
    online: boolean; serverCount: number
    ram: number; cpu: number; disk: number
    versionRelease?: string
  }[]
  activity: {
    totalUsers: number
    adminCount: number
    totalImages: number
    loginsByDay: Record<string, number>
    recentLogins: { userId: number; ipAddress?: string; timestamp: string }[]
  }
}

interface PlayerStatsData {
  totalPlayers: number
  maxCapacity: number
  onlineServers: number
  utilization: number
  servers: {
    uuid: string; name: string; onlinePlayers: number; maxPlayers: number
    players: string[]; version?: string; motd?: string
  }[]
  history: { timestamp: string; count: number }[]
  error?: string
}

function StatCard({ label, value, sub, valueClass }: { label: string; value: string | number; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-4">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueClass || 'text-neutral-800 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  )
}

function fmt(n: number) { return n.toLocaleString() }
function fmtRam(mb: number) { return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB` }

export default function AdminAnalyticsPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('servers')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [psData, setPsData] = useState<PlayerStatsData | null>(null)
  const [psError, setPsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [psLoading, setPsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const psChartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<unknown>(null)
  const psChartInstance = useRef<unknown>(null)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData(d)
      if (isRefresh) showToast('Analytics refreshed', 'success')
    } catch {
      showToast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadPlayerStats() {
    setPsLoading(true)
    setPsError(null)
    try {
      const res = await fetch('/api/admin/analytics?type=playerstats')
      const d = await res.json()
      if (d.error) { setPsError(d.error); setPsData(null) }
      else setPsData(d)
    } catch {
      setPsError('Failed to load player statistics.')
    } finally {
      setPsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const requested = searchParams?.get('tab')
    if (requested === 'servers' || requested === 'nodes' || requested === 'activity' || requested === 'playerstats') {
      setTab(requested)
    }
  }, [searchParams])

  useEffect(() => {
    if (tab === 'playerstats' && !psData && !psLoading) loadPlayerStats()
  }, [tab])

  useEffect(() => {
    if (!data || tab !== 'activity' || !chartRef.current) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInstance.current) (chartInstance.current as { destroy(): void }).destroy()
      const isDark = document.documentElement.classList.contains('dark')
      const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
      const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
      const labels = Object.keys(data.activity.loginsByDay).slice(-30)
      const values = Object.values(data.activity.loginsByDay).slice(-30)
      chartInstance.current = new Chart(chartRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'Logins', data: values, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', borderRadius: 4 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, min: 0 },
          },
        },
      })
    }).catch(() => {})
  }, [data, tab])

  useEffect(() => {
    if (!psData?.history?.length || tab !== 'playerstats' || !psChartRef.current) return
    import('chart.js/auto').then(({ default: Chart }) => {
      if (psChartInstance.current) (psChartInstance.current as { destroy(): void }).destroy()
      const isDark = document.documentElement.classList.contains('dark')
      const textColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
      const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
      psChartInstance.current = new Chart(psChartRef.current!, {
        type: 'line',
        data: {
          labels: psData.history.map(h => new Date(h.timestamp).toLocaleTimeString()),
          datasets: [{
            label: 'Players', data: psData.history.map(h => h.count),
            borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
            borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 8 } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, min: 0 },
          },
        },
      })
    }).catch(() => {})
  }, [psData, tab])

  function barRow(label: string, value: number, max: number) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f97316' : '#3b82f6'
    return (
      <div key={label}>
        <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
          <span className="truncate max-w-[60%] font-medium">{label}</span>
          <span className="shrink-0 tabular-nums">{fmt(value)} <span className="text-neutral-400">({pct}%)</span></span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-white/5">
          <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'servers', label: 'Servers' },
    { key: 'nodes', label: 'Nodes' },
    { key: 'activity', label: 'Activity' },
    { key: 'playerstats', label: 'Player Stats' },
  ]

  function changeTab(nextTab: Tab) {
    setTab(nextTab)
    router.replace(`${pathname}?tab=${nextTab}`, { scroll: false })
  }

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-5 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-base font-medium text-neutral-800 dark:text-white">Analytics</h1>
              <p className="text-sm text-neutral-500 mt-0.5">Live data from the database and connected daemons.</p>
            </div>
            <button
              onClick={() => tab === 'playerstats' ? loadPlayerStats() : load(true)}
              disabled={refreshing || psLoading}
              className="flex items-center gap-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm font-medium transition">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="flex gap-0.5 border-b border-neutral-200 dark:border-neutral-700/40 mb-6">
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => changeTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2 ${
                  tab === t.key
                    ? 'text-neutral-800 dark:text-white border-neutral-800 dark:border-white'
                    : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-12 text-neutral-400">
              <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
              <span className="text-sm">Loading analytics…</span>
            </div>
          ) : (
            <>
              {tab === 'servers' && data && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total servers" value={fmt(data.servers.total)}
                      sub={data.servers.suspended > 0 ? `${data.servers.suspended} suspended` : 'none suspended'} />
                    <StatCard label="Allocated RAM" value={fmtRam(data.servers.totalRamMb)} sub="across all servers" />
                    <StatCard label="Allocated CPU" value={`${data.servers.totalCpuPct}%`} sub="total allocation" />
                    <StatCard label="Allocated disk" value={`${data.servers.totalStorageGb} GB`} sub="total allocation" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white mb-4">Images in use</p>
                      <div className="space-y-3">
                        {data.servers.topImages.length
                          ? data.servers.topImages.map(i => barRow(i.name || 'Unknown', i.count, data.servers.topImages[0].count))
                          : <p className="text-sm text-neutral-400">No servers yet.</p>}
                      </div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">Highest allocated servers</p>
                      </div>
                      <div className="divide-y divide-neutral-100 dark:divide-white/5">
                        {data.servers.topServers.length ? data.servers.topServers.map((sv, i) => (
                          <div key={i} className="flex items-center gap-4 px-5 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-neutral-700 dark:text-neutral-300 truncate font-medium">{sv.name}</p>
                              <p className="text-xs text-neutral-400">{sv.owner} · {sv.image}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                              <span>{fmt(sv.memory)} MB</span>
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

              {tab === 'nodes' && data && (
                <div className="animate-fade-in-up space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard label="Nodes" value={fmt(data.nodes.length)} />
                    <StatCard label="Online" value={fmt(data.nodes.filter(n => n.online).length)} valueClass="text-2xl font-semibold text-emerald-600 dark:text-emerald-400" />
                    <StatCard label="Offline" value={fmt(data.nodes.filter(n => !n.online).length)} valueClass="text-2xl font-semibold text-red-500 dark:text-red-400" />
                  </div>
                  <div className="space-y-3">
                    {data.nodes.length === 0 ? (
                      <p className="text-sm text-neutral-400">No nodes configured.</p>
                    ) : data.nodes.map((n, i) => (
                      <div key={i} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${n.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-neutral-800 dark:text-white">{n.name}</p>
                              <p className="text-xs text-neutral-400 font-mono">{n.address}:{n.port}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-neutral-500">
                            {n.online && n.versionRelease && (
                              <span className="font-mono bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-2 py-0.5 rounded-md">{n.versionRelease}</span>
                            )}
                            <span>{n.serverCount} server{n.serverCount !== 1 ? 's' : ''}</span>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${n.online ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                              {n.online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        {(n.ram > 0 || n.cpu > 0 || n.disk > 0) ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">RAM limit</p><p className="text-sm font-medium text-neutral-800 dark:text-white">{fmtRam(n.ram)}</p></div>
                            <div><p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">CPU limit</p><p className="text-sm font-medium text-neutral-800 dark:text-white">{n.cpu}%</p></div>
                            <div><p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Disk limit</p><p className="text-sm font-medium text-neutral-800 dark:text-white">{n.disk} GB</p></div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400">No capacity limits configured.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'activity' && data && (
                <div className="animate-fade-in-up space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Users" value={fmt(data.activity.totalUsers)} sub={`${data.activity.adminCount} admin${data.activity.adminCount !== 1 ? 's' : ''}`} />
                    <StatCard label="Images installed" value={fmt(data.activity.totalImages)} sub="in library" />
                    <StatCard label="Logins (30d)" value={fmt(Object.values(data.activity.loginsByDay).reduce((s, v) => s + v, 0))} sub="panel sessions" />
                    <StatCard label="Avg/day" value={fmt(Math.round(Object.values(data.activity.loginsByDay).reduce((s, v) => s + v, 0) / 30))} sub="logins per day" />
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white mb-4">Login activity — last 30 days</p>
                    <div className="relative h-44"><canvas ref={chartRef} /></div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white">Recent logins</p>
                    </div>
                    <div className="divide-y divide-neutral-100 dark:divide-white/5">
                      {data.activity.recentLogins.length ? data.activity.recentLogins.map((l, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3">
                          <span className="text-xs font-mono text-neutral-500 shrink-0">#{l.userId}</span>
                          <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 flex-1">{l.ipAddress || 'Unknown'}</span>
                          <span className="text-xs text-neutral-400 shrink-0">{new Date(l.timestamp).toLocaleString()}</span>
                        </div>
                      )) : (
                        <p className="px-5 py-5 text-center text-sm text-neutral-400">No login history.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'playerstats' && (
                <div className="animate-fade-in-up">
                  {psLoading && (
                    <div className="flex items-center gap-3 py-12 text-neutral-400">
                      <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
                      <span className="text-sm">Loading player stats…</span>
                    </div>
                  )}
                  {psError && !psLoading && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 px-5 py-4">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Error</p>
                      <p className="text-xs text-red-500/70 dark:text-red-400/60 mt-0.5">{psError}</p>
                    </div>
                  )}
                  {psData && !psLoading && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total Players" value={psData.totalPlayers} sub="Across all servers" />
                        <StatCard label="Max Capacity" value={psData.maxCapacity} sub="Total player slots" />
                        <StatCard label="Online Servers" value={psData.onlineServers} sub="Currently running" />
                        <StatCard label="Utilization" value={`${psData.utilization}%`} sub="Player capacity used"
                          valueClass={`text-2xl font-semibold ${psData.utilization >= 90 ? 'text-red-500 dark:text-red-400' : psData.utilization >= 70 ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-800 dark:text-white'}`} />
                      </div>

                      {psData.history.length > 0 && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-medium text-neutral-800 dark:text-white">Player count history</p>
                            <p className="text-xs text-neutral-400">Every 5 minutes, last 48h</p>
                          </div>
                          <div className="relative h-48"><canvas ref={psChartRef} /></div>
                        </div>
                      )}

                      {psData.servers.length > 0 && (
                        <div>
                          <h2 className="text-sm font-medium text-neutral-800 dark:text-white mb-3">Servers</h2>
                          <div className="space-y-2">
                            {psData.servers.map(srv => (
                              <div key={srv.uuid} className="flex items-center gap-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-5 py-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{srv.name}</p>
                                  {srv.motd && <p className="text-xs text-neutral-400 truncate">{srv.motd}</p>}
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                                  {srv.version && <span className="font-mono bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/5 px-2 py-0.5 rounded-md">{srv.version}</span>}
                                  <span className={srv.onlinePlayers > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                                    {srv.onlinePlayers}<span className="text-neutral-400">/{srv.maxPlayers}</span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PanelLayout>
  )
}
