'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface OverviewData {
  userCount: number
  instanceCount: number
  nodeCount: number
  imageCount: number
  version: string
  nodeEnv: string
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
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">

        <FadeUp>
          <div className="mb-6">
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Overview</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Panel statistics and system information</p>
          </div>
        </FadeUp>

        {loading ? (
          <FadeIn className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
          </FadeIn>
        ) : data ? (
          <>
            <FadeUp delay={0.05}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Users', value: data.userCount, sub: 'Registered' },
                  { label: 'Servers', value: data.instanceCount, sub: 'Active instances' },
                  { label: 'Nodes', value: data.nodeCount, sub: 'Connected nodes' },
                  { label: 'Images', value: data.imageCount, sub: 'Available images' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-4">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-neutral-500 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </FadeUp>

            <FadeUp delay={0.1}>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5 mb-6">
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
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${checkingUpdate ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Check Updates
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { href: 'https://discord.gg/BybfXms7JZ', label: 'Discord', sub: 'Community support and discussions', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" /></svg> },
                  { href: 'https://airlinklabs.xyz/', label: 'Docs', sub: 'Usage and configuration guides', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg> },
                  { href: 'https://github.com/airlinklabs', label: 'GitHub', sub: 'Source code and contributions', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg> },
                  { href: 'https://discord.gg/BybfXms7JZ', label: 'Support', sub: 'Get help from the team', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> },
                ].map(link => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="group rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-4 hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
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
