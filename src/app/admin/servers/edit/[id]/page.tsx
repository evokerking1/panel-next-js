'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface ServerData {
  id: number
  UUID: string
  name: string
  description?: string
  Memory: number
  Cpu: number
  Storage: number
  Suspended: boolean
  Installing: boolean
  StartCommand?: string
  allowStartupEdit: boolean
  ownerId: number
  nodeId: number
  imageId: number
}

interface NodeOption { id: number; name: string }
interface ImageOption { id: number; name?: string }
interface UserOption { id: number; username?: string; email: string }

export default function EditServerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [server, setServer] = useState<ServerData | null>(null)
  const [nodes, setNodes] = useState<NodeOption[]>([])
  const [images, setImages] = useState<ImageOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', Memory: '', Cpu: '', Storage: '',
    ownerId: '', nodeId: '', imageId: '', StartCommand: '',
    Suspended: false, allowStartupEdit: false,
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/servers/${id}`).then(r => r.json()),
      fetch('/api/admin/nodes').then(r => r.json()),
      fetch('/api/admin/images').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([sd, nd, id2, ud]) => {
      const s = sd.server
      setServer(s)
      setNodes(nd.nodes || [])
      setImages(id2.images || [])
      setUsers(ud.users || [])
      if (s) {
        setForm({
          name: s.name,
          description: s.description || '',
          Memory: String(s.Memory),
          Cpu: String(s.Cpu),
          Storage: String(s.Storage),
          ownerId: String(s.ownerId),
          nodeId: String(s.nodeId),
          imageId: String(s.imageId),
          StartCommand: s.StartCommand || '',
          Suspended: s.Suspended,
          allowStartupEdit: s.allowStartupEdit,
        })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Server updated.', 'success')
      router.push('/admin/servers')
    } else {
      showToast(d.error || 'Failed to update server.', 'error')
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition'
  const selectClass = inputClass

  if (loading) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </PanelLayout>
  )

  if (!server) return (
    <PanelLayout>
      <div className="px-8 pt-6">
        <p className="text-sm text-neutral-500">Server not found.</p>
      </div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/servers" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Edit server</h1>
            <p className="text-sm text-neutral-500 mt-0.5 font-mono">{server.UUID}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">General</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Name</label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Owner</label>
                  <select value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} className={selectClass}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Node</label>
                  <select value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))} className={selectClass}>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Image</label>
                <select value={form.imageId} onChange={e => setForm(f => ({ ...f, imageId: e.target.value }))} className={selectClass}>
                  {images.map(i => <option key={i.id} value={i.id}>{i.name || `Image #${i.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Start command override</label>
                <input type="text" value={form.StartCommand} onChange={e => setForm(f => ({ ...f, StartCommand: e.target.value }))} className={inputClass} placeholder="Leave blank to use image default" />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Resources</h2>
            </div>
            <div className="px-5 py-5 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">RAM (MB)</label>
                <input type="number" required value={form.Memory} onChange={e => setForm(f => ({ ...f, Memory: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">CPU (%)</label>
                <input type="number" required value={form.Cpu} onChange={e => setForm(f => ({ ...f, Cpu: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Disk (GB)</label>
                <input type="number" required value={form.Storage} onChange={e => setForm(f => ({ ...f, Storage: e.target.value }))} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Access</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { key: 'Suspended', label: 'Suspended', sub: 'Block the server from starting.' },
                { key: 'allowStartupEdit', label: 'Allow startup edit', sub: 'Let the user edit startup variables.' },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>
                  </div>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${(form as Record<string, unknown>)[key] ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-neutral-900 rounded-full shadow transition-transform ${(form as Record<string, unknown>)[key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link href="/admin/servers"
              className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PanelLayout>
  )
}
