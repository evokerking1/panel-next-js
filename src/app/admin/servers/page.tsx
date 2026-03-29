'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

interface Server {
  id: number
  UUID: string
  name: string
  description?: string
  Memory: number
  Cpu: number
  Storage: number
  Suspended: boolean
  Installing: boolean
  node: { name: string; address: string }
  owner: { username?: string; email: string }
  image: { name?: string }
}

export default function AdminServersPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null)

  useEffect(() => {
    fetch('/api/admin/servers').then(r => r.json()).then(d => setServers(d.servers || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.UUID.toLowerCase().includes(search.toLowerCase()) ||
    s.owner?.username?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/servers/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setServers(prev => prev.filter(s => s.id !== deleteTarget.id))
      showToast('Server deleted.', 'success')
    } else {
      showToast('Failed to delete server.', 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Servers</h1>
            <p className="text-sm text-neutral-500 mt-0.5">{servers.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition w-44"
              placeholder="Search..." />
            <Link href="/admin/servers/create"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
              New server
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-x-auto shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
              <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                <tr>{['Server', 'Owner', 'Node', 'Image', 'Resources', 'Status', 'Actions'].map(h => (
                  <th key={h} className="py-3 pl-6 pr-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-6 pr-3">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.name}</p>
                      <p className="text-xs font-mono text-neutral-400">{s.UUID.split('-')[0]}</p>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.owner?.username || s.owner?.email}</td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.node.name}</td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.image?.name || '—'}</td>
                    <td className="px-3 py-3.5">
                      <div className="text-xs text-neutral-500 space-y-0.5">
                        <p>{s.Memory} MB · {s.Cpu}% · {s.Storage} GB</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {s.Suspended
                        ? <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Suspended</span>
                        : s.Installing
                          ? <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">Installing</span>
                          : <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Active</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/server/${s.UUID}`} className="text-xs text-blue-500 hover:underline">View</Link>
                        <Link href={`/admin/servers/edit/${s.id}`} className="text-xs text-neutral-500 hover:underline">Edit</Link>
                        <button onClick={() => setDeleteTarget(s)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="py-8 text-center text-sm text-neutral-400">No servers found.</div>}
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} title="Delete server?"
        body={`Permanently delete "${deleteTarget?.name}"? The container will be removed from the node.`}
        confirmLabel="Delete" danger onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </PanelLayout>
  )
}
