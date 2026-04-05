'use client'

import { X , Loader2} from 'lucide-react'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"

interface NodeData {
  id: number; name: string; ram: number; disk: number; cpu: number
  address: string; port: number; key: string
  allocatedPorts?: string | number[]
  servers?: { UUID: string; Ports?: string }[]
}

export default function AdminNodeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [node, setNode] = useState<NodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nodeStats, setNodeStats] = useState<Record<string, unknown> | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', ram: '', disk: '', cpu: '', address: '', port: '' })
  const [allocatedPorts, setAllocatedPorts] = useState<number[]>([])
  const [portInput, setPortInput] = useState('')
  const [usedPorts, setUsedPorts] = useState<Set<number>>(new Set())

  async function fetchStats() {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const res = await fetch(`/api/admin/nodes/${id}/stats`)
      const d = await res.json()
      if (res.ok) setNodeStats(d.stats)
      else setStatsError(d.error || 'Failed to fetch stats.')
    } catch {
      setStatsError('Could not reach the node.')
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetch(`/api/admin/nodes/${id}`)
      .then(r => r.json())
      .then(d => {
        const n: NodeData = d.node || d
        setNode(n)
        setForm({
          name: n.name || '',
          ram: String(n.ram || ''),
          disk: String(n.disk || ''),
          cpu: String(n.cpu || ''),
          address: n.address || '',
          port: String(n.port || ''),
        })
        const ports = typeof n.allocatedPorts === 'string'
          ? JSON.parse(n.allocatedPorts || '[]')
          : (n.allocatedPorts || [])
        setAllocatedPorts(ports)
        const used = new Set<number>()
        n.servers?.forEach(srv => {
          if (!srv.Ports) return
          try {
            JSON.parse(srv.Ports).forEach((p: { Port: string }) => {
              const num = parseInt(p.Port.split(':')[0])
              if (!isNaN(num)) used.add(num)
            })
          } catch {}
        })
        setUsedPorts(used)
      })
      .catch(() => showToast('Failed to load node', 'error'))
      .finally(() => { setLoading(false); fetchStats() })
  }, [id])

  function setField(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function addPort() {
    const input = portInput.trim()
    if (!input) return
    const next = [...allocatedPorts]
    if (input.includes('-')) {
      const [s, e] = input.split('-').map(p => parseInt(p.trim()))
      if (isNaN(s) || isNaN(e) || s >= e || s < 1024 || e > 65535) {
        showToast('Invalid port range (1024–65535, start < end)', 'error'); return
      }
      for (let p = s; p <= e; p++) { if (!next.includes(p)) next.push(p) }
    } else {
      const p = parseInt(input)
      if (isNaN(p) || p < 1024 || p > 65535) { showToast('Invalid port (1024–65535)', 'error'); return }
      if (!next.includes(p)) next.push(p)
    }
    next.sort((a, b) => a - b)
    setAllocatedPorts(next)
    setPortInput('')
  }

  function removePort(p: number) {
    if (usedPorts.has(p)) { showToast('Cannot remove port in use by a server', 'error'); return }
    setAllocatedPorts(prev => prev.filter(x => x !== p))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/nodes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, allocatedPorts: JSON.stringify(allocatedPorts) }),
    })
    if (res.ok) {
      showToast('Node updated successfully', 'success')
      setTimeout(() => router.push('/admin/nodes'), 800)
    } else {
      showToast('Error updating node', 'error')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Edit Node</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Update node configuration and allocated ports.</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div id="nodeForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Name:</label>
                  <input className={inputClass} placeholder="My node" value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">RAM (MB):</label>
                  <input className={inputClass} placeholder="For information purposes only" value={form.ram} onChange={e => setField('ram', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Disk (GB):</label>
                  <input className={inputClass} placeholder="For information purposes only" value={form.disk} onChange={e => setField('disk', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">CPU:</label>
                  <input className={inputClass} placeholder="For information purposes only" value={form.cpu} onChange={e => setField('cpu', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">IP Address:</label>
                  <input className={inputClass} placeholder="localhost" value={form.address} onChange={e => setField('address', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Daemon Port:</label>
                  <input className={inputClass} placeholder="3002" value={form.port} onChange={e => setField('port', e.target.value)} />
                </div>

                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Daemon Key:</label>
                  <input className={`${inputClass} opacity-60 cursor-not-allowed`} value={node?.key || ''} disabled />
                </div>

                <div className="col-span-2">
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Allocated Ports:</label>
                  <div className="flex flex-col space-y-2">
                    <div className="grid grid-cols-4 gap-2 mb-2 min-h-[2rem]">
                      {allocatedPorts.length === 0 ? (
                        <div className="col-span-4 text-sm text-neutral-500 italic">No ports allocated yet. Add ports that will be available for servers.</div>
                      ) : allocatedPorts.map(p => {
                        const inUse = usedPorts.has(p)
                        return (
                          <div key={p} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${inUse ? 'bg-amber-600/10 dark:bg-amber-700/20' : 'bg-neutral-800/10 dark:bg-neutral-700/20'}`}>
                            <span className={inUse ? 'text-amber-600 dark:text-amber-400 flex items-center gap-1.5' : 'text-neutral-800 dark:text-neutral-300'}>
                              {p}
                              {inUse && <span className="text-xs bg-amber-600/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">In use</span>}
                            </span>
                            <button onClick={() => removePort(p)} disabled={inUse}
                              className={`ml-2 text-neutral-500 hover:text-red-500 transition-colors ${inUse ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="25565 or 25565-25570" value={portInput}
                        onChange={e => setPortInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPort()}
                        className="rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5" />
                      <button onClick={addPort} type="button"
                        className="rounded-xl bg-neutral-900 dark:bg-neutral-800 border border-neutral-700/30 px-3 py-2 text-sm font-medium shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-700 transition text-neutral-300 whitespace-nowrap">
                        Add Port
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 mt-4">
                  <button onClick={handleSave} disabled={saving} type="button"
                    className="w-full md:w-auto rounded-lg bg-neutral-950 dark:bg-white hover:bg-neutral-300 text-neutral-200 dark:text-neutral-800 px-3 py-2 text-sm font-medium shadow-md transition disabled:opacity-60">
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="mt-6 px-4 sm:px-6">
            <div className="bg-white dark:bg-neutral-800/30 border border-neutral-200 dark:border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Node Stats</h2>
                <button onClick={fetchStats} disabled={statsLoading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition disabled:opacity-50">
                  {statsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {statsError ? (
                <p className="text-sm text-red-500">{statsError}</p>
              ) : nodeStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {Object.entries(nodeStats).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-xs text-neutral-500 mb-0.5 capitalize">{key}</p>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 font-mono">{String(val)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No stats available.</p>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
