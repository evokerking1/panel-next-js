'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, Plus } from 'lucide-react'
import PanelLayout from '@/components/layout/panel-layout'
import Modal from '@/components/ui/modal'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

interface Node {
  id: number
  name: string
  address: string
  port: number
  ram: number
  cpu: number
  disk: number
  online?: boolean
  versionRelease?: string
  instances?: { UUID: string }[]
}

export default function AdminNodesPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Node | null>(null)
  const [configureNode, setConfigureNode] = useState<{ name: string; command: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/nodes')
      .then(r => r.json())
      .then(d => setNodes(d.nodes || []))
      .catch(() => showToast('Failed to load nodes', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/nodes/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setNodes(current => current.filter(node => node.id !== deleteTarget.id))
      showToast('Node deleted.', 'success')
    } else {
      showToast('Failed to delete node.', 'error')
    }
  }

  async function fetchConfigure(node: Node) {
    const res = await fetch(`/api/admin/nodes/${node.id}/configure`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      showToast(data.error || 'Failed to fetch configure command.', 'error')
      return
    }
    setConfigureNode({ name: node.name, command: data.command || '' })
  }

  const totalInstances = nodes.reduce((total, node) => total + (node.instances?.length ?? 0), 0)
  const onlineCount = nodes.filter(node => node.online).length
  const hasOfflineNodes = nodes.some(node => !node.online)

  return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">
        <div className="panel-toolbar">
          <div className="panel-page-heading">
            <h1 className="panel-page-title">Nodes</h1>
            <p className="panel-page-subtitle">Manage daemon nodes and view their status.</p>
          </div>
          <Link
            href="/admin/nodes/create"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-700/40 bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Node
          </Link>
        </div>

        <FadeUp delay={0.04}>
          <div className="panel-stat-grid">
            <div className="panel-stat-card">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Total Nodes</p>
              <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{nodes.length}</p>
              <p className="mt-1 text-xs text-neutral-500">{nodes.length > 0 ? `${onlineCount} online` : 'No nodes available'}</p>
            </div>
            <div className="panel-stat-card">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Servers</p>
              <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{totalInstances}</p>
              <p className="mt-1 text-xs text-neutral-500">across all nodes</p>
            </div>
            <div className="panel-stat-card">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">Offline Nodes</p>
              <p className="text-2xl font-semibold text-neutral-800 dark:text-white">{nodes.length - onlineCount}</p>
              <p className="mt-1 text-xs text-neutral-500">need attention</p>
            </div>
          </div>
        </FadeUp>

        {hasOfflineNodes && (
          <FadeUp delay={0.06}>
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-800/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">One or more nodes are offline</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs text-white transition hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.08}>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-700/30 dark:bg-neutral-800/50">
              <p className="text-sm text-neutral-500">No nodes yet.</p>
              <Link href="/admin/nodes/create" className="mt-2 text-sm text-blue-500 hover:underline">
                Create your first node
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden xl:block panel-table-shell overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                    <tr>
                      {['Node', 'Version', 'Resources', 'Instances', 'Actions'].map(label => (
                        <th key={label} className="px-4 py-3 text-left text-xs font-medium text-neutral-500">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white dark:divide-white/5 dark:bg-transparent">
                    {nodes.map(node => (
                      <tr key={node.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700/40 dark:bg-neutral-800">
                              <span className={`inline-flex h-2 w-2 rounded-full ${node.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-800 dark:text-white">{node.name}</p>
                              <p className="truncate font-mono text-xs text-neutral-500">{node.address}:{node.port}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex rounded-md border px-2 py-1 font-medium ${
                            node.versionRelease
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
                          }`}>
                            {node.versionRelease || 'unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                          {node.ram} MB
                          <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                          {node.cpu}%
                          <span className="mx-2 text-neutral-300 dark:text-neutral-600">·</span>
                          {node.disk} GB
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300">
                          {node.instances?.length ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => fetchConfigure(node)}
                              className="rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:border-neutral-700/40 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              Configure
                            </button>
                            <Link
                              href={`/admin/nodes/${node.id}`}
                              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(node)}
                              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 xl:hidden">
              {nodes.map(node => (
                <div key={node.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-white/5 dark:bg-neutral-800/20">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700/40 dark:bg-neutral-800">
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${node.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-white">{node.name}</p>
                      <p className="truncate font-mono text-xs text-neutral-500">{node.address}:{node.port}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {node.instances?.length ?? 0} instance{(node.instances?.length ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                      node.versionRelease
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {node.versionRelease || 'unknown'}
                    </span>
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2 text-[11px] text-neutral-500 sm:grid-cols-3">
                    <div>
                      <p className="uppercase tracking-wide">RAM</p>
                      <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{node.ram} MB</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">CPU</p>
                      <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{node.cpu}%</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wide">Disk</p>
                      <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">{node.disk} GB</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fetchConfigure(node)}
                        className="rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:border-neutral-700/40 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      >
                        Configure
                      </button>
                      <Link
                        href={`/admin/nodes/${node.id}`}
                        className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(node)}
                        className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </FadeUp>

        {configureNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">Node Configuration</p>
              <p className="mt-1 text-xs text-neutral-500">Run this command to auto-configure {configureNode.name}.</p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-100 p-3 text-xs text-emerald-600 dark:bg-neutral-800 dark:text-emerald-400">
                {configureNode.command}
              </pre>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfigureNode(null)}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(configureNode.command)
                    showToast('Copied to clipboard', 'success')
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          open={!!deleteTarget}
          title="Delete node"
          body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    </PanelLayout>
  )
}
