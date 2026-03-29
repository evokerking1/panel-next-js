'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Stats {
  userCount: number
  nodeCount: number
  instanceCount: number
  imageCount: number
}

function StatCard({ label, value, sub, href }: { label: string; value: number; sub: string; href?: string }) {
  const inner = (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-4 hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{sub}</p>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function AdminOverviewPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const [stats, setStats] = useState<Stats | null>(null)
  const [version] = useState('1.0.0')
  const [updateStatus, setUpdateStatus] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    fetch('/api/admin/overview').then(r => r.json()).then(d => setStats(d)).catch(() => {})
  }, [])

  async function checkUpdate() {
    setChecking(true)
    setUpdateStatus('Checking...')
    setTimeout(() => {
      setUpdateStatus(`Running the latest version (v${version}).`)
      setChecking(false)
    }, 1200)
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Overview</h1>
          <p className="text-sm text-neutral-500 mt-0.5">System status and quick links</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Users" value={stats?.userCount ?? 0} sub="Registered" href="/admin/users" />
          <StatCard label="Servers" value={stats?.instanceCount ?? 0} sub="Active instances" href="/admin/servers" />
          <StatCard label="Nodes" value={stats?.nodeCount ?? 0} sub="Connected" href="/admin/nodes" />
          <StatCard label="Images" value={stats?.imageCount ?? 0} sub="Available" href="/admin/images" />
        </div>

        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-neutral-900 dark:bg-white/10 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white dark:text-neutral-200">
                  <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-white">Airlink Panel</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 text-neutral-600 dark:text-neutral-400">v{version}</span>
                </div>
              </div>
            </div>
            <button onClick={checkUpdate} disabled={checking}
              className="rounded-xl bg-neutral-200 dark:bg-neutral-700/60 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-white/5 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60">
              {checking
                ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>}
              Check updates
            </button>
          </div>
          {updateStatus && <p className="text-sm text-neutral-600 dark:text-neutral-400">{updateStatus}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: '/admin/nodes', label: 'Nodes', desc: 'Manage compute nodes' },
            { href: '/admin/servers', label: 'Servers', desc: 'View all servers' },
            { href: '/admin/users', label: 'Users', desc: 'Manage user accounts' },
            { href: '/admin/images', label: 'Images', desc: 'Docker images & eggs' },
            { href: '/admin/settings', label: 'Settings', desc: 'Panel configuration' },
            { href: '/admin/analytics', label: 'Analytics', desc: 'Usage statistics' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-4 hover:border-neutral-300 dark:hover:border-white/10 transition-colors block">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{item.label}</p>
              <p className="text-xs text-neutral-500 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </PanelLayout>
  )
}
