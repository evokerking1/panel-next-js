'use client'

import { Trash2 , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

interface Addon {
  id: number
  name: string
  slug: string
  version?: string
  author?: string
  description?: string
  enabled: boolean
}

export default function AdminAddonsPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Addon | null>(null)
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/addons')
      .then(r => r.json())
      .then(d => setAddons(d.addons || []))
      .catch(() => showToast('Failed to load addons', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function toggleEnabled(addon: Addon) {
    const res = await fetch(`/api/admin/addons/${addon.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !addon.enabled }),
    })
    if (res.ok) {
      setAddons(prev => prev.map(a => a.id === addon.id ? { ...a, enabled: !a.enabled } : a))
    } else {
      showToast('Failed to update addon.', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/addons/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setAddons(prev => prev.filter(a => a.id !== deleteTarget.id))
      showToast('Addon deleted.', 'success')
    } else {
      showToast('Failed to delete addon.', 'error')
    }
    setDeleteTarget(null)
  }

  const filtered = addons.filter(a =>
    !search || `${a.name} ${a.description || ''} ${a.author || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">

        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Addons</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Manage installed addons and browse the store</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-2">
            <Link href="/admin/addons/store"
              className="border border-neutral-800/20 rounded-xl bg-white hover:bg-neutral-200 dark:hover:bg-neutral-300 text-neutral-800 px-3 py-2 text-sm font-medium shadow-lg transition">
              Store
            </Link>
            <button onClick={load} type="button"
              className="border border-neutral-800/20 rounded-xl bg-white hover:bg-neutral-200 dark:hover:bg-neutral-300 text-neutral-800 px-3 py-2 text-sm font-medium shadow-lg transition">
              Reload
            </button>
          </FadeUp>
        </div>

        <FadeUp delay={0.08}>
          <div className="mx-8 mt-6 flex border-b border-neutral-200 dark:border-neutral-800">
            <span className="px-1 py-2.5 mr-5 text-sm font-medium text-neutral-800 dark:text-white border-b-2 border-neutral-800 dark:border-white -mb-px">
              Installed <span className="ml-1 text-xs text-neutral-400">{addons.length}</span>
            </span>
            <Link href="/admin/addons/store" className="px-1 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border-b-2 border-transparent -mb-px transition">
              Store
            </Link>
          </div>
        </FadeUp>

        {addons.length > 0 && (
          <FadeUp delay={0.09}>
            <div className="mx-8 mt-5 mb-1">
              <input value={search} onChange={e => setSearch(e.target.value)}
                type="text" placeholder="Filter addons…"
                className="w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition" />
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
            </div>
          ) : addons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center mx-8">
              <p className="text-sm text-neutral-500">No addons installed.</p>
              <Link href="/admin/addons/store"
                className="mt-4 rounded-xl border border-neutral-800/20 bg-white px-3 py-2 text-sm font-medium text-neutral-800 shadow-lg transition hover:bg-neutral-200 dark:hover:bg-neutral-300">
                Browse Store
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto shadow-sm rounded-xl m-8 border border-neutral-200 dark:border-neutral-800/40">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Version</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Status</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {filtered.map(addon => (
                    <tr key={addon.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                        <p className="font-medium text-neutral-800 dark:text-white">{addon.name}</p>
                        {addon.description && <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">{addon.description}</p>}
                      </td>
                      <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">{addon.version || '—'}</td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                          addon.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700/40'
                        }`}>
                          {addon.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleEnabled(addon)}
                            className="text-xs text-blue-500 hover:text-blue-600 transition">
                            {addon.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => setDeleteTarget(addon)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeUp>

        <Modal open={!!deleteTarget} title="Delete addon?"
          body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
