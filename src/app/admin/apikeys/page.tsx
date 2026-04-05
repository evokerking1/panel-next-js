'use client'

import { Trash2 , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'
import Modal from '@/components/ui/modal'

interface ApiKey {
  id: number
  name: string
  description?: string
  key: string
  createdBy?: { username: string }
  enabled: boolean
  createdAt: string
}

export default function AdminApiKeysPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [newKey, setNewKey] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/apikeys')
      .then(r => r.json())
      .then(d => setKeys(d.apiKeys || []))
      .catch(() => showToast('Failed to load API keys', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!form.name.trim()) { showToast('Name required', 'error'); return }
    setSaving(true)
    const res = await fetch('/api/admin/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      setKeys(prev => [...prev, d.apiKey])
      setNewKey(d.apiKey?.key || null)
      setCreateOpen(false)
      setForm({ name: '', description: '' })
    } else {
      showToast(d.error || 'Failed to create key.', 'error')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/apikeys/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setKeys(prev => prev.filter(k => k.id !== deleteTarget.id))
      showToast('Key deleted.', 'success')
    } else {
      showToast('Failed to delete key.', 'error')
    }
    setDeleteTarget(null)
  }

  function maskKey(key: string) {
    if (key.length <= 8) return '••••••••'
    return key.slice(0, 4) + '••••••••' + key.slice(-4)
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">

        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">API Keys Management</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Create and manage API keys with specific permissions</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-2">
            <a href="/admin/apikeys/docs"
              className="rounded-xl border border-neutral-200 dark:border-neutral-700/40 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm font-medium transition">
              API Docs
            </a>
            <button onClick={() => setCreateOpen(true)} type="button"
              className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-300 text-neutral-200 dark:text-neutral-800 px-3 py-2 text-sm font-medium shadow-md transition">
              Create API Key
            </button>
          </FadeUp>
        </div>

        {newKey && (
          <FadeUp delay={0.06}>
            <div className="mx-8 mt-5 px-4 py-4 rounded-xl bg-emerald-50 dark:bg-emerald-800/10 border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-1">API key created — copy it now</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400/70 mb-2">This key will not be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-white dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-800 dark:text-emerald-300 break-all flex-1">{newKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey); showToast('Copied!', 'success') }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition">
                  Copy
                </button>
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-emerald-600 dark:text-emerald-400/70 hover:underline">Dismiss</button>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          <div className="px-8 mt-5">
            <div className="rounded-xl bg-neutral-700/10 dark:bg-neutral-900 p-6">
              <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                  <h1 className="text-base font-semibold text-neutral-800 dark:text-white">API Keys</h1>
                  <p className="mt-1 text-sm text-neutral-500">A list of all API keys in your panel.</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-800 dark:text-white sm:pl-0">Name</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-800 dark:text-white">Key</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-800 dark:text-white">Created By</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-800 dark:text-white">Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-800 dark:text-white">Created</th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {keys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-sm text-center text-neutral-500">No API keys found</td>
                      </tr>
                    ) : keys.map(k => (
                      <tr key={k.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-neutral-800 dark:text-white sm:pl-0">
                          {k.name}
                          {k.description && <p className="text-xs text-neutral-500 mt-0.5">{k.description}</p>}
                        </td>
                        <td className="px-3 py-4 text-sm font-mono text-neutral-500 dark:text-neutral-400">{maskKey(k.key)}</td>
                        <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">{k.createdBy?.username || '—'}</td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                            k.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700/40'
                          }`}>
                            {k.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 pl-3 pr-4 text-right sm:pr-0">
                          <button onClick={() => setDeleteTarget(k)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </FadeUp>

        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setCreateOpen(false) }}>
            <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-4">Create API Key</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Name</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                    placeholder="My API Key" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Description (optional)</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                    placeholder="What this key is used for" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                  {saving ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal open={!!deleteTarget} title="Delete API key?"
          body={`Delete "${deleteTarget?.name}"? Any services using this key will stop working.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
