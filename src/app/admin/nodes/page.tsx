'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

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

function NodeCard({ node, onDelete }: { node: Node; onDelete: (n: Node) => void }) {
  const [cmd, setCmd] = useState('')
  const [showCmd, setShowCmd] = useState(false)

  async function fetchCmd() {
    const res = await fetch(`/api/admin/nodes/${node.id}/configure`)
    const d = await res.json()
    setCmd(d.command || '')
    setShowCmd(true)
  }

  return (
    <div className="bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-4 hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">{node.name}</h3>
            <span className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${node.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">{node.address}:{node.port}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/admin/nodes/${node.id}`}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
          </Link>
          <button onClick={() => onDelete(node)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ label: 'RAM', value: `${node.ram} MB` }, { label: 'CPU', value: `${node.cpu}%` }, { label: 'Disk', value: `${node.disk} GB` }].map(s => (
          <div key={s.label} className="bg-neutral-50 dark:bg-neutral-700/20 rounded-lg px-2 py-1.5">
            <p className="text-[10px] text-neutral-400">{s.label}</p>
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/5">
        <span className="text-xs text-neutral-500">{node.instances?.length ?? 0} server{(node.instances?.length ?? 0) !== 1 ? 's' : ''}</span>
        <button onClick={fetchCmd} className="text-xs text-blue-500 hover:text-blue-600 transition">Configure</button>
      </div>
      {showCmd && (
        <div className="mt-3 p-2 bg-neutral-900 rounded-lg">
          <p className="text-[11px] font-mono text-neutral-300 break-all">{cmd}</p>
          <button onClick={() => { navigator.clipboard.writeText(cmd); setShowCmd(false) }}
            className="mt-1 text-[10px] text-neutral-500 hover:text-neutral-300">Copy & close</button>
        </div>
      )}
    </div>
  )
}

export default function AdminNodesPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Node | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', port: '3001', ram: '', cpu: '', disk: '' })

  useEffect(() => {
    fetch('/api/admin/nodes').then(r => r.json()).then(d => setNodes(d.nodes || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function setField(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      setNodes(prev => [...prev, { ...d.node, online: false, instances: [] }])
      setCreateOpen(false)
      setForm({ name: '', address: '', port: '3001', ram: '', cpu: '', disk: '' })
      showToast('Node created.', 'success')
    } else {
      showToast(d.error || 'Failed to create node.', 'error')
    }
    setSaving(false)
  }

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

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Nodes</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage compute nodes</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
            Add node
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-neutral-500">No nodes yet.</p>
            <button onClick={() => setCreateOpen(true)} className="mt-2 text-sm text-blue-500 hover:underline">Add your first node</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {nodes.map(n => <NodeCard key={n.id} node={n} onDelete={setDeleteTarget} />)}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-4">Add node</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div><label className="block text-xs text-neutral-500 mb-1">Name</label><input className={inputClass} value={form.name} onChange={e => setField('name', e.target.value)} required placeholder="Node 1" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Address</label><input className={inputClass} value={form.address} onChange={e => setField('address', e.target.value)} required placeholder="127.0.0.1" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Port</label><input className={inputClass} type="number" value={form.port} onChange={e => setField('port', e.target.value)} required placeholder="3001" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-neutral-500 mb-1">RAM (MB)</label><input className={inputClass} type="number" value={form.ram} onChange={e => setField('ram', e.target.value)} required placeholder="4096" /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">CPU (%)</label><input className={inputClass} type="number" value={form.cpu} onChange={e => setField('cpu', e.target.value)} required placeholder="400" /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Disk (GB)</label><input className={inputClass} type="number" value={form.disk} onChange={e => setField('disk', e.target.value)} required placeholder="100" /></div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                  {saving ? 'Creating...' : 'Create node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} title="Delete node?"
        body={`Delete "${deleteTarget?.name}"? This cannot be undone. Servers on this node will not be deleted.`}
        confirmLabel="Delete" danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)} />
    </PanelLayout>
  )
}
