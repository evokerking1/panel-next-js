'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'

interface ApiKey {
  id: number
  name: string
  key: string
  description?: string
  permissions: string
  active: boolean
  createdAt: string
  user?: { username?: string; email: string }
}

const ALL_PERMISSIONS = [
  'airlink.api.users.read', 'airlink.api.users.write',
  'airlink.api.servers.read', 'airlink.api.servers.write',
  'airlink.api.nodes.read', 'airlink.api.nodes.write',
  'airlink.api.images.read',
]

export default function AdminApiKeysPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })

  function load() {
    fetch('/api/admin/apikeys').then(r => r.json()).then(d => setKeys(d.keys || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return
    setSaving(true)
    const res = await fetch('/api/admin/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      load()
      setCreateOpen(false)
      setForm({ name: '', description: '', permissions: [] })
      if (d.rawKey) setNewKey(d.rawKey)
      else showToast('API key created.', 'success')
    } else {
      showToast(d.error || 'Failed.', 'error')
    }
    setSaving(false)
  }

  async function toggleKey(key: ApiKey) {
    const res = await fetch(`/api/admin/apikeys/${key.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle: true }),
    })
    if (res.ok) {
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, active: !k.active } : k))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/apikeys/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) { setKeys(prev => prev.filter(k => k.id !== deleteTarget.id)); showToast('Key deleted.', 'success') }
    setDeleteTarget(null)
  }

  function togglePerm(perm: string) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }))
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">API Keys</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage access tokens for the REST API</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
            New key
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-400">No API keys yet.</div>
        ) : (
          <div className="space-y-3">
            {keys.map(k => {
              const perms: string[] = (() => { try { return JSON.parse(k.permissions) } catch { return [] } })()
              return (
                <div key={k.id} className="bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-neutral-900 dark:text-white">{k.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${k.active ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500'}`}>
                          {k.active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      {k.description && <p className="text-xs text-neutral-500 mt-0.5">{k.description}</p>}
                      <p className="text-[11px] font-mono text-neutral-400 mt-1">{k.key.length > 20 ? k.key.slice(0, 8) + '••••••••' + k.key.slice(-4) : '••••••••'}</p>
                      {perms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {perms.slice(0, 4).map(p => (
                            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 dark:text-neutral-400 font-mono">{p.split('.').pop()}</span>
                          ))}
                          {perms.length > 4 && <span className="text-[10px] text-neutral-400">+{perms.length - 4} more</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleKey(k)} className={`text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${k.active ? 'border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5' : 'border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
                        {k.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => setDeleteTarget(k)} className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">Delete</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-2">Created {new Date(k.createdAt).toLocaleDateString()} · {k.user?.username || k.user?.email || 'System'}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-4">Create API key</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-xs text-neutral-500 mb-1">Name <span className="text-red-400">*</span></label><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="My Integration" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Description</label><input className={inputClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What this key is for" /></div>
              <div>
                <label className="block text-xs text-neutral-500 mb-2">Permissions</label>
                <div className="space-y-1.5">
                  {ALL_PERMISSIONS.map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 disabled:opacity-60 transition">
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-2">Save your API key</h2>
            <p className="text-xs text-neutral-500 mb-4">This key will only be shown once. Copy it now and store it securely.</p>
            <div className="bg-neutral-900 rounded-lg p-3 mb-4">
              <p className="text-xs font-mono text-emerald-400 break-all">{newKey}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { navigator.clipboard.writeText(newKey); showToast('Copied!', 'success') }}
                className="px-4 py-2 rounded-lg text-sm border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5 transition">Copy</button>
              <button onClick={() => setNewKey(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 transition">Done</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} title="Delete API key?"
        body={`Delete "${deleteTarget?.name}"? Any integrations using this key will stop working.`}
        confirmLabel="Delete" danger onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </PanelLayout>
  )
}
