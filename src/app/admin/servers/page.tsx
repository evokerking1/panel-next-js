'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'

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
    const res = await fetch(`/api/admin/servers/${deleteTarget.UUID}`, { method: 'DELETE' })
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
    for (const uuid of selected) {
      await fetch(`/api/admin/servers/${uuid}`, { method: 'DELETE' }).catch(() => {})
    }
    setServers(prev => prev.filter(s => !selected.has(s.UUID)))
    setSelected(new Set())
    showToast(`Deleted ${selected.size} server(s).`, 'success')
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">

        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Servers</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Manage all servers across nodes</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button onClick={() => router.push('/admin/servers/create')} type="button"
              className="border border-neutral-800/20 dark:border-white/10 block rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-800 dark:text-white px-3 py-2 text-center text-sm font-medium shadow-sm transition">
              Create New Server
            </button>
          </FadeUp>
        </div>

        {selected.size > 0 && (
          <FadeUp delay={0.02}>
            <div className="mx-8 mt-4 pb-0.5">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/40">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mr-1">{selected.size} selected</span>
                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
                <button onClick={bulkDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 border border-red-700/30 px-3 py-1.5 text-xs font-medium text-white transition-colors ml-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  Delete
                </button>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.1}>
          <div className="overflow-x-auto shadow-sm rounded-xl m-8 border border-neutral-200 dark:border-neutral-800/40">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
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
                          <Link href={`/admin/servers/edit/${server.UUID}`}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </Link>
                          <button onClick={() => setDeleteTarget(server)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
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
