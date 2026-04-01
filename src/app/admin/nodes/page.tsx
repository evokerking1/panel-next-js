'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'

interface Node {
  id: number
  name: string
  address: string
  port: number
  ram: number
  cpu: number
  disk: number
  key: string
  online?: boolean
  instances?: { UUID: string }[]
}

export default function AdminNodesPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Node | null>(null)
  const [showConfigure, setShowConfigure] = useState<{ id: number; cmd: string } | null>(null)
  const [offlineNodes, setOfflineNodes] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/admin/nodes')
      .then(r => r.json())
      .then(d => {
        const list: Node[] = d.nodes || []
        setNodes(list)
        const offline = list.filter(n => !n.online).map(n => n.id)
        setOfflineNodes(offline)
      })
      .catch(() => showToast('Failed to load nodes', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/nodes/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setNodes(prev => prev.filter(n => n.id !== deleteTarget.id))
      showToast('Node deleted.', 'success')
    } else {
      showToast('Failed to delete node.', 'error')
    }
    setDeleteTarget(null)
  }

  async function fetchConfigure(nodeId: number) {
    const res = await fetch(`/api/admin/nodes/${nodeId}/configure`)
    const d = await res.json()
    setShowConfigure({ id: nodeId, cmd: d.command || '' })
  }

  const totalInstances = nodes.reduce((t, n) => t + (n.instances?.length ?? 0), 0)
  const onlineCount = nodes.filter(n => n.online).length

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto pt-16">

        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Nodes</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Manage daemon nodes and view their status</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link href="/admin/nodes/create"
              className="border border-neutral-800/20 block rounded-xl bg-white hover:bg-neutral-200 dark:hover:bg-neutral-300 text-neutral-800 px-3 py-2 text-center text-sm font-medium shadow-lg transition duration-300">
              Create New Node
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.08}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 m-8">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-white mb-2">Total Nodes</h2>
              <p className="text-4xl font-normal text-neutral-800 dark:text-white">{nodes.length}</p>
              {nodes.length > 0 ? (
                <p className="text-sm text-neutral-400 mt-2">Online: {onlineCount}</p>
              ) : (
                <p className="text-sm text-neutral-400 mt-2">No nodes available</p>
              )}
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-white mb-2">Server Count</h2>
              <p className="text-4xl font-normal text-neutral-800 dark:text-white">{totalInstances}</p>
              {nodes.length > 0 ? (
                <p className="text-sm text-neutral-400 mt-2">
                  Average density: {(totalInstances / nodes.length).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-neutral-400 mt-2">No instances available</p>
              )}
            </div>
          </div>
        </FadeUp>

        {offlineNodes.length > 0 && (
          <FadeUp delay={0.1}>
            <div className="mt-0 ml-8 mr-8 mb-0">
              <div className="rounded-xl bg-red-600/20 dark:bg-red-800/10 px-4 py-6 shadow-lg border border-neutral-800/20">
                <div className="flex">
                  <div className="flex-shrink-0 ml-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-2 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <h3 className="text-sm font-medium text-red-500 dark:text-red-400">Connection Error</h3>
                    <p className="text-sm text-red-500/70 dark:text-red-400/50">One or more nodes are offline. Some information may be unavailable.</p>
                    <button onClick={() => window.location.reload()} className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors">
                      Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.12}>
          <div className="overflow-x-auto shadow-sm rounded-xl m-8 border border-neutral-200 dark:border-neutral-800/40" id="nodeTable">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-neutral-500">No nodes yet.</p>
                <Link href="/admin/nodes/create" className="mt-2 text-sm text-blue-500 hover:underline">Create your first node</Link>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Name</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Connection</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Servers</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Resources</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Status</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {nodes.map(node => (
                    <tr key={node.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <p className="font-medium text-neutral-800 dark:text-white">{node.name}</p>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{node.address}:{node.port}</p>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 text-neutral-600 dark:text-neutral-400">
                        {node.instances?.length ?? 0}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 text-neutral-500 dark:text-neutral-400">
                        {node.ram}MB RAM · {node.cpu}% CPU · {node.disk}GB
                      </td>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                          node.online
                            ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${node.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {node.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => fetchConfigure(node.id)}
                            className="text-xs text-blue-500 hover:text-blue-600 transition">
                            Configure
                          </button>
                          <Link href={`/admin/nodes/${node.id}`}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </Link>
                          <button onClick={() => setDeleteTarget(node)}
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

        {showConfigure && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">Configure Node</h2>
              <p className="text-xs text-neutral-500 mb-3">Run this command on your daemon server:</p>
              <div className="p-3 bg-neutral-900 rounded-xl mb-4">
                <p className="text-xs font-mono text-neutral-300 break-all">{showConfigure.cmd}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowConfigure(null)}
                  className="px-4 py-2 rounded-xl text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                  Close
                </button>
                <button onClick={() => { navigator.clipboard.writeText(showConfigure.cmd); showToast('Copied to clipboard', 'success') }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal open={!!deleteTarget} title="Delete node?"
          body={`Delete "${deleteTarget?.name}"? This cannot be undone. Servers on this node will not be deleted.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
