'use client'

import { Pencil, Trash2 , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'
import Modal from '@/components/ui/modal'

interface Server {
  id: number
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
  Memory: number
  Cpu: number
  Storage: number
  owner?: { id: number; username: string }
  node?: { id: number; name: string; address: string }
  image?: { id: number; name: string }
}

export default function AdminServersPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/servers')
      .then(r => r.json())
      .then(d => setServers(d.servers || []))
      .catch(() => showToast('Failed to load servers', 'error'))
      .finally(() => setLoading(false))
  }, [])

  function toggleSelect(uuid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uuid) ? next.delete(uuid) : next.add(uuid)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === servers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(servers.map(s => s.UUID)))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/servers/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setServers(prev => prev.filter(s => s.UUID !== deleteTarget.UUID))
      showToast('Server deleted.', 'success')
    } else {
      showToast('Failed to delete server.', 'error')
    }
    setDeleteTarget(null)
  }

  async function bulkDelete() {
    if (selected.size === 0) return
    const confirmed = window.confirm(`Delete ${selected.size} server(s)? This cannot be undone.`)
    if (!confirmed) return
    for (const server of servers) {
      if (!selected.has(server.UUID)) continue
      await fetch(`/api/admin/servers/${server.id}`, { method: 'DELETE' }).catch(() => {})
    }
    setServers(prev => prev.filter(s => !selected.has(s.UUID)))
    setSelected(new Set())
    showToast(`Deleted ${selected.size} server(s).`, 'success')
  }

  return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">

        <div className="panel-toolbar">
          <FadeUp className="panel-page-heading">
            <h1 className="panel-page-title">Servers</h1>
            <p className="panel-page-subtitle">Manage all servers across nodes</p>
          </FadeUp>
          <FadeUp delay={0.05}>
            <button onClick={() => router.push('/admin/servers/create')} type="button"
              className="border border-neutral-800/20 dark:border-white/10 block rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white px-3 py-2 text-center text-sm font-medium shadow-sm transition">
              Create New Server
            </button>
          </FadeUp>
        </div>

        {selected.size > 0 && (
          <FadeUp delay={0.02}>
            <div className="pb-0.5">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/40">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mr-1">{selected.size} selected</span>
                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                <button onClick={bulkDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 border border-red-700/30 px-3 py-1.5 text-xs font-medium text-white transition-colors ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          <div className="panel-table-shell overflow-x-auto shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
              </div>
            ) : servers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-neutral-500">No servers yet.</p>
                <button onClick={() => router.push('/admin/servers/create')} className="mt-2 text-sm text-blue-500 hover:underline">Create your first server</button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 sm:pl-6">
                      <input type="checkbox" className="rounded border-neutral-300 dark:border-neutral-600"
                        checked={selected.size === servers.length && servers.length > 0}
                        onChange={toggleAll} />
                    </th>
                    <th className="py-3.5 pl-2 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="py-3.5 px-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Owner</th>
                    <th className="py-3.5 px-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Node</th>
                    <th className="py-3.5 px-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Resources</th>
                    <th className="py-3.5 px-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {servers.map(server => (
                    <tr key={server.UUID} className="hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors">
                      <td className="py-4 pl-4 pr-3 sm:pl-6">
                        <input type="checkbox" className="rounded border-neutral-300 dark:border-neutral-600"
                          checked={selected.has(server.UUID)}
                          onChange={() => toggleSelect(server.UUID)} />
                      </td>
                      <td className="py-4 pl-2 pr-3 text-sm">
                        <p className="font-medium text-neutral-800 dark:text-white">{server.name}</p>
                        {server.description && <p className="text-xs text-neutral-500 truncate max-w-xs">{server.description}</p>}
                        <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{server.UUID.split('-')[0]}</p>
                      </td>
                      <td className="px-3 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {server.owner?.username || '—'}
                      </td>
                      <td className="px-3 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {server.node?.name || '—'}
                      </td>
                      <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {server.Memory}MB · {server.Cpu} CPU · {server.Storage}GB
                      </td>
                      <td className="px-3 py-4 text-sm">
                        {server.Suspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">Suspended</span>
                        ) : server.Installing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">Installing</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Active</span>
                        )}
                      </td>
                      <td className="py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/servers/edit/${server.id}`}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setDeleteTarget(server)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </FadeUp>

        <Modal open={!!deleteTarget} title="Delete server?"
          body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
