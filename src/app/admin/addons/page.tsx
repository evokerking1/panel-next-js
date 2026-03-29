'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface Addon {
  id: number
  name: string
  slug: string
  description?: string
  version: string
  author?: string
  enabled: boolean
  createdAt: string
}

export default function AdminAddonsPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/addons')
      .then(r => r.json())
      .then(d => setAddons(d.addons || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleAddon(addon: Addon) {
    const res = await fetch(`/api/admin/addons/${addon.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !addon.enabled }),
    })
    if (res.ok) {
      setAddons(prev => prev.map(a => a.id === addon.id ? { ...a, enabled: !a.enabled } : a))
      showToast(`${addon.name} ${addon.enabled ? 'disabled' : 'enabled'}.`, 'success')
    }
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Addons</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage installed panel addons</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : addons.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 py-16 text-center">
            <p className="text-sm text-neutral-500">No addons installed.</p>
            <p className="text-xs text-neutral-400 mt-1">Place addon folders in <code className="font-mono text-neutral-500">storage/addons/</code> and restart the panel.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addons.map(addon => (
              <div key={addon.id} className="bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white">{addon.name}</h3>
                    <span className="text-[10px] font-mono text-neutral-400">v{addon.version}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${addon.enabled ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500'}`}>
                      {addon.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {addon.description && <p className="text-xs text-neutral-500 mt-0.5">{addon.description}</p>}
                  {addon.author && <p className="text-xs text-neutral-400 mt-0.5">by {addon.author}</p>}
                </div>
                <button onClick={() => toggleAddon(addon)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    addon.enabled
                      ? 'border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5'
                      : 'border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                  }`}>
                  {addon.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  )
}
