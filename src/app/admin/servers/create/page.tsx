'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface NodeOption { id: number; name: string; address: string; allocatedPorts?: string }
interface ImageOption { id: number; name?: string; dockerImages?: string; startup?: string; variables?: string }
interface UserOption { id: number; username?: string; email: string }

export default function CreateServerPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [nodes, setNodes] = useState<NodeOption[]>([])
  const [images, setImages] = useState<ImageOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '', description: '', ownerId: '', nodeId: '', imageId: '',
    Memory: '1024', Cpu: '100', Storage: '10',
    allowStartupEdit: false,
  })
  const [selectedPort, setSelectedPort] = useState<number | null>(null)
  const [availablePorts, setAvailablePorts] = useState<number[]>([])
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [dockerImage, setDockerImage] = useState('')
  const [dockerOptions, setDockerOptions] = useState<{ label: string; image: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/nodes').then(r => r.json()),
      fetch('/api/admin/images').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([nd, id, ud]) => {
      setNodes(nd.nodes || [])
      setImages(id.images || [])
      setUsers(ud.users || [])
      if (nd.nodes?.length) setForm(f => ({ ...f, nodeId: String(nd.nodes[0].id) }))
      if (id.images?.length) setForm(f => ({ ...f, imageId: String(id.images[0].id) }))
      if (ud.users?.length) setForm(f => ({ ...f, ownerId: String(ud.users[0].id) }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const node = nodes.find(n => n.id === parseInt(form.nodeId))
    if (!node) { setAvailablePorts([]); setSelectedPort(null); return }
    try {
      const ports = JSON.parse(node.allocatedPorts || '[]') as number[]
      setAvailablePorts(ports)
      setSelectedPort(ports[0] ?? null)
    } catch {
      setAvailablePorts([])
      setSelectedPort(null)
    }
  }, [form.nodeId, nodes])

  useEffect(() => {
    const image = images.find(i => i.id === parseInt(form.imageId))
    if (!image) return
    try {
      const parsed = JSON.parse(image.dockerImages || '[]')
      const opts = parsed.flatMap((obj: Record<string, string>) =>
        Object.entries(obj).map(([label, img]) => ({ label, image: img }))
      )
      setDockerOptions(opts)
      if (opts.length) setDockerImage(opts[0].image)
    } catch {
      setDockerOptions([])
      setDockerImage('')
    }
    try {
      const vars = JSON.parse(image.variables || '[]')
      const initial: Record<string, string> = {}
      for (const v of vars) {
        const key = v.env_variable || v.env || v.name
        if (key) initial[key] = String(v.default_value ?? '')
      }
      setVariables(initial)
    } catch {
      setVariables({})
    }
  }, [form.imageId, images])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('Server name is required.', 'error'); return }
    if (!selectedPort && availablePorts.length > 0) { showToast('Please select a port.', 'error'); return }

    setCreating(true)
    const ports = selectedPort ? [{ primary: true, Port: selectedPort }] : []

    const image = images.find(i => i.id === parseInt(form.imageId))
    const variablesList = (() => {
      try {
        const vars = JSON.parse(image?.variables || '[]')
        return vars.map((v: Record<string, unknown>) => ({
          ...v,
          value: variables[String(v.env_variable || v.env || v.name)] ?? v.default_value ?? '',
        }))
      } catch { return [] }
    })()

    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          Ports: JSON.stringify(ports),
          dockerImage,
          variables: JSON.stringify(variablesList),
        }),
      })
      const d = await res.json()
      if (res.ok) {
        showToast(d.warning ? d.warning : 'Server created.', d.warning ? 'error' : 'success')
        router.push('/admin/servers')
      } else {
        showToast(d.error || 'Failed to create server.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    }
    setCreating(false)
  }

  const selectClass = "w-full rounded-xl text-sm px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-700/20 border border-neutral-200 dark:border-white/5 text-neutral-800 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition"
  const inputClass = selectClass

  const selectedImage = images.find(i => i.id === parseInt(form.imageId))
  const imageVars = (() => {
    try { return JSON.parse(selectedImage?.variables || '[]') } catch { return [] }
  })()

  if (loading) return (
    <PanelLayout><div className="flex items-center justify-center h-64"><svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Create Server</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Deploy a new server instance</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Basic info */}
          <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="block text-xs text-neutral-500 mb-1">Server name <span className="text-red-400">*</span></label><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="My Server" /></div>
              <div className="sm:col-span-2"><label className="block text-xs text-neutral-500 mb-1">Description</label><input className={inputClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Owner <span className="text-red-400">*</span></label>
                <select className={selectClass} value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.username || u.email}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-neutral-500 mb-1">Node <span className="text-red-400">*</span></label>
                <select className={selectClass} value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))}>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Port allocation */}
          <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-4">Port Allocation</h2>
            {availablePorts.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">No ports allocated to this node. Edit the node to add ports first.</p>
            ) : (
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Assign port</label>
                <select className={selectClass} value={selectedPort ?? ''} onChange={e => setSelectedPort(parseInt(e.target.value))}>
                  {availablePorts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Image & resources */}
          <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
            <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-4">Image & Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="block text-xs text-neutral-500 mb-1">Image <span className="text-red-400">*</span></label>
                <select className={selectClass} value={form.imageId} onChange={e => setForm(f => ({ ...f, imageId: e.target.value }))}>
                  {images.map(i => <option key={i.id} value={i.id}>{i.name || `Image ${i.id}`}</option>)}
                </select>
              </div>
              {dockerOptions.length > 0 && (
                <div className="sm:col-span-2"><label className="block text-xs text-neutral-500 mb-1">Docker image</label>
                  <select className={selectClass} value={dockerImage} onChange={e => setDockerImage(e.target.value)}>
                    {dockerOptions.map(o => <option key={o.image} value={o.image}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div><label className="block text-xs text-neutral-500 mb-1">Memory (MB)</label><input type="number" className={inputClass} value={form.Memory} onChange={e => setForm(f => ({ ...f, Memory: e.target.value }))} /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">CPU (%)</label><input type="number" className={inputClass} value={form.Cpu} onChange={e => setForm(f => ({ ...f, Cpu: e.target.value }))} /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Storage (GB)</label><input type="number" className={inputClass} value={form.Storage} onChange={e => setForm(f => ({ ...f, Storage: e.target.value }))} /></div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="allowStartupEdit" checked={form.allowStartupEdit} onChange={e => setForm(f => ({ ...f, allowStartupEdit: e.target.checked }))} className="rounded" />
                <label htmlFor="allowStartupEdit" className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">Allow startup edit</label>
              </div>
            </div>
          </div>

          {/* Variables */}
          {imageVars.length > 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
              <h2 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-4">Environment Variables</h2>
              <div className="space-y-3">
                {imageVars.map((v: Record<string, string | number | boolean>, i: number) => {
                  const key = String(v.env_variable || v.env || v.name || '')
                  return (
                    <div key={i}>
                      <label className="block text-xs text-neutral-500 mb-1">{String(v.name || key)} <span className="font-mono text-neutral-400">{key}</span></label>
                      <input className={inputClass} value={variables[key] ?? String(v.default_value ?? '')}
                        onChange={e => setVariables(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={String(v.default_value ?? '')} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition flex items-center gap-2">
              {creating && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
              {creating ? 'Creating...' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </PanelLayout>
  )
}
