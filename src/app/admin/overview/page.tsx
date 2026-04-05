'use client'
import { RefreshCw, ExternalLink, BookOpen, Code2, HelpCircle , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

interface OverviewData {
  userCount: number
  instanceCount: number
  nodeCount: number
  imageCount: number
  version: string
  nodeEnv: string
  nodes?: { id: number; name: string; address: string; port: number; online: boolean }[]
  recentServers?: { id: number; uuid: string; name: string; createdAt: string; owner: string }[]
}

export default function AdminOverviewPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiLatency, setApiLatency] = useState<number | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    const t = Date.now()
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setApiLatency(Date.now() - t)
      })
      .catch(() => showToast('Failed to load overview', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function checkUpdates() {
    setCheckingUpdate(true)
    setUpdateStatus(null)
    try {
      const res = await fetch('https://api.github.com/repos/airlinklabs/panel/releases/latest')
      const d = await res.json()
      const latest = d.tag_name?.replace(/^v/, '') || null
      setLatestVersion(latest)
      if (latest && data?.version && latest === data.version) {
        setUpdateStatus('up-to-date')
      } else if (latest) {
        setUpdateStatus('update-available')
      } else {
        setUpdateStatus('unknown')
      }
    } catch {
      setUpdateStatus('error')
    }
    setCheckingUpdate(false)
  }

  const latencyPct = apiLatency ? Math.min((apiLatency / 500) * 100, 100) : 0

    return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">

        <FadeUp>
          <div className="panel-page-heading">
            <h1 className="panel-page-title">Overview</h1>
            <p className="panel-page-subtitle">Panel statistics and system information</p>
          </div>
        </FadeUp>

        {loading ? (
          <FadeIn className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
          </FadeIn>
        ) : data ? (
          <>
            <FadeUp delay={0.05}>
              <div className="panel-stat-grid">
                {[
                  { label: 'Users', value: data.userCount, sub: 'Registered' },
                  { label: 'Servers', value: data.instanceCount, sub: 'Active instances' },
                  { label: 'Nodes', value: data.nodeCount, sub: 'Connected nodes' },
                  { label: 'Images', value: data.imageCount, sub: 'Available images' },
                ].map(stat => (
                  <div key={stat.label} className="panel-stat-card">
                    <p className="panel-stat-label">{stat.label}</p>
                    <p className="panel-stat-value">{stat.value}</p>
                    <p className="panel-stat-subtle">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="panel-card">
                <div className="panel-card-body space-y-5">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <img src="/assets/airlink_logo.png" className="h-10 w-10 rounded-xl shrink-0" alt="Airlink" />
                    <div>
                      <p className="text-sm font-medium text-neutral-800 dark:text-white">Airlink Panel</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 text-neutral-600 dark:text-neutral-400">
                          v{data.version || '—'}
                        </span>
                        <span className="text-[10px] text-neutral-500">{data.nodeEnv}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={checkUpdates} disabled={checkingUpdate}
                      className="rounded-xl bg-neutral-200 dark:bg-neutral-700/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/5 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60">
                      <RefreshCw className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
                      Check Updates
                    </button>
                  </div>
                </div>

                <div className="panel-grid-wide">
                  <div className="rounded-xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-white/5 p-4">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-3">API Response Time</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                        {apiLatency !== null ? `${apiLatency} ms` : '-- ms'}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700/40 rounded-full h-1.5">
                      <div className="bg-neutral-400 dark:bg-neutral-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${latencyPct}%` }} />
                    </div>
                  </div>

                  <div className="rounded-xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-white/5 p-4">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Update Status</p>
                    <p className="text-xs text-neutral-500 mb-3">
                      Current version: <span className="text-neutral-700 dark:text-neutral-300 font-medium">{data.version || '—'}</span>
                    </p>
                    {updateStatus === 'up-to-date' && (
                      <div className="text-sm rounded-lg p-3 bg-emerald-50 dark:bg-emerald-800/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        You are on the latest version.
                      </div>
                    )}
                    {updateStatus === 'update-available' && (
                      <div className="text-sm rounded-lg p-3 bg-amber-50 dark:bg-amber-800/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        Version {latestVersion} is available.
                      </div>
                    )}
                    {updateStatus === 'error' && (
                      <div className="text-sm rounded-lg p-3 bg-red-50 dark:bg-red-800/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                        Could not check for updates.
                      </div>
                    )}
                    {!updateStatus && (
                      <div className="text-sm rounded-lg p-3 bg-neutral-200/60 dark:bg-neutral-800/60 text-neutral-500">
                        Click "Check Updates" to check.
                      </div>
                    )}
                  </div>
                </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.12}>
              <div className="panel-grid-wide">
                <div className="panel-card">
                  <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white">Node Status</p>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-white/5">
                    {data.nodes?.length ? data.nodes.map(node => (
                      <div key={node.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-white">{node.name}</p>
                          <p className="text-xs font-mono text-neutral-400">{node.address}:{node.port}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${node.online ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${node.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {node.online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    )) : (
                      <p className="px-5 py-4 text-sm text-neutral-400">No nodes available.</p>
                    )}
                  </div>
                </div>

                <div className="panel-card">
                  <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-white/5">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white">Recent Activity</p>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-white/5">
                    {data.recentServers?.length ? data.recentServers.map(server => (
                      <div key={server.id} className="px-5 py-3">
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{server.name}</p>
                        <p className="text-xs text-neutral-500">Created by {server.owner} on {new Date(server.createdAt).toLocaleString()}</p>
                      </div>
                    )) : (
                      <p className="px-5 py-4 text-sm text-neutral-400">No recent server activity.</p>
                    )}
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="panel-stat-grid">
                {[
                  { href: 'https://discord.gg/BybfXms7JZ', label: 'Discord', sub: 'Community support and discussions', icon: <ExternalLink className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" /> },
                  { href: 'https://airlinklabs.xyz/', label: 'Docs', sub: 'Usage and configuration guides', icon: <BookOpen className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" /> },
                  { href: 'https://github.com/airlinklabs', label: 'GitHub', sub: 'Source code and contributions', icon: <Code2 className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" /> },
                  { href: 'https://discord.gg/BybfXms7JZ', label: 'Support', sub: 'Get help from the team', icon: <HelpCircle className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" /> },
                ].map(link => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="group panel-stat-card hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      {link.icon}
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{link.label}</p>
                    </div>
                    <p className="text-xs text-neutral-500">{link.sub}</p>
                  </a>
                ))}
              </div>
            </FadeUp>
          </>
        ) : null}
      </div>
    </PanelLayout>
  )
}

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>{children}</div>
  )
}
