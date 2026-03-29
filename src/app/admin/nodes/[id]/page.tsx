'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface NodeData {
  id: number
  name: string
  address: string
  port: number
  ram: number
  cpu: number
  disk: number
  key: string
  allocatedPorts?: string
  servers: { UUID: string; name: string }[]
}

export default function NodeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [node, setNode] = useState<NodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [portInput, setPortInput] = useState('')
  const [allocatedPorts, setAllocatedPorts] = useState<number[]>([])
  const [form, setForm] = useState({ name: '', address: '', port: '', ram: '', cpu: '', disk: '' })

  useEffect(() => {
    fetch(`/api/admin/nodes/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.node) {
          const n = d.node
          setNode(n)
          setForm({ name: n.name, address: n.address, port: String(n.port), ram: String(n.ram), cpu: String(n.cpu), disk: String(n.disk) })
          try { setAllocatedPorts(JSON.parse(n.allocatedPorts || '[]')) } catch { setAllocatedPorts([]) }
        }
      })
      .catch(() => showToast('Failed to load node.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function addPort() {
    const p = parseInt(portInput.trim())
    if (isNaN(p) || p < 1024 || p > 65535) { showToast('Port must be between 1024–65535.', 'error'); return }
    if (allocatedPorts.includes(p)) { showToast('Port already added.', 'error'); return }
    setAllocatedPorts(prev => [...prev, p].sort((a, b) => a - b))
    setPortInput('')
  }

  function removePort(p: number) { setAllocatedPorts(prev => prev.filter(x => x !== p)) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/admin/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, allocatedPorts: JSON.stringify(allocatedPorts) }),
    })
    const d = await res.json()
    if (res.ok) showToast('Node updated.', 'success')
    else showToast(d.error || 'Failed to save.', 'error')
    setSaving(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  if (loading) return (
    <PanelLayout><div className="flex items-center justify-center h-64"><svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></PanelLayout>
  )

  if (!node) return <PanelLayout><div className="px-8 py-12 text-sm text-neutral-400">Node not found.</div></PanelLayout>

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold text-neutral-800 dark:text-white">Edit: {node.name}</h1>
            <p className="text-xs text-neutral-500">{node.address}:{node.port}</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-4">Node Details</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-neutral-500 mb-1">Name</label><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Address</label><input className={inputClass} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Port</label><input type="number" className={inputClass} value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-neutral-500 mb-1">RAM (MB)</label><input type="number" className={inputClass} value={form.ram} onChange={e => setForm(f => ({ ...f, ram: e.target.value }))} required /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">CPU (%)</label><input type="number" className={inputClass} value={form.cpu} onChange={e => setForm(f => ({ ...f, cpu: e.target.value }))} required /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Disk (GB)</label><input type="number" className={inputClass} value={form.disk} onChange={e => setForm(f => ({ ...f, disk: e.target.value }))} required /></div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Port Allocation</h2>
            <p className="text-xs text-neutral-500 mb-4">These ports will be available to assign to servers on this node.</p>
            <div className="flex gap-2 mb-3">
              <input type="number" className={inputClass + ' flex-1'} value={portInput} onChange={e => setPortInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPort() } }}
                placeholder="e.g. 25565" min={1025} max={65535} />
              <button type="button" onClick={addPort} className="px-3 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition shrink-0">Add</button>
            </div>
            {allocatedPorts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allocatedPorts.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 text-sm font-mono text-neutral-700 dark:text-neutral-300">
                    {p}
                    <button type="button" onClick={() => removePort(p)} className="text-neutral-400 hover:text-red-500 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {node.servers.length > 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-3">Servers on this node ({node.servers.length})</h2>
              <div className="space-y-1.5">
                {node.servers.map(s => (
                  <div key={s.UUID} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-700 dark:text-neutral-300">{s.name}</span>
                    <span className="font-mono text-neutral-400">{s.UUID.split('-')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Authentication Key</h2>
            <p className="text-[11px] font-mono text-neutral-500 break-all">{node.key}</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()} className="px-5 py-2.5 rounded-xl text-sm border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </PanelLayout>
  )
}
