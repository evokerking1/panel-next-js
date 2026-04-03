'use client'

import { Pencil , Loader2} from 'lucide-react'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"
const selectClass = "rounded-xl text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 border border-neutral-800/10 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-white/20"

interface ServerData {
  id: number; UUID: string; name: string; description?: string
  Memory: number; Cpu: number; Storage: number
  StartCommand: string; dockerImage?: string
  ownerId?: number; nodeId?: number; imageId?: number
  Suspended: boolean; allowStartupEdit: boolean
}
interface Node { id: number; name: string; address: string }
interface User { id: number; username: string }
interface Image { id: number; name: string }

export default function AdminServerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [server, setServer] = useState<ServerData | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', ownerId: '', nodeId: '', imageId: '',
    Memory: '', Cpu: '', Storage: '', StartCommand: '',
    dockerImage: '', Suspended: false, allowStartupEdit: false,
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/servers/${id}`).then(r => r.json()),
      fetch('/api/admin/nodes').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/images').then(r => r.json()),
    ]).then(([sd, nd, ud, imgd]) => {
      const s = sd.server || sd
      setServer(s)
      setNodes(nd.nodes || [])
      setUsers(ud.users || [])
      setImages(imgd.images || [])
      setForm({
        name: s.name || '',
        description: s.description || '',
        ownerId: String(s.ownerId || ''),
        nodeId: String(s.nodeId || ''),
        imageId: String(s.imageId || ''),
        Memory: String(s.Memory || ''),
        Cpu: String(s.Cpu || ''),
        Storage: String(s.Storage || ''),
        StartCommand: s.StartCommand || '',
        dockerImage: s.dockerImage || '',
        Suspended: s.Suspended || false,
        allowStartupEdit: s.allowStartupEdit || false,
      })
    }).catch(() => showToast('Failed to load server', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function setField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ownerId: parseInt(form.ownerId),
        nodeId: parseInt(form.nodeId),
        imageId: parseInt(form.imageId),
        Memory: parseInt(form.Memory),
        Cpu: parseInt(form.Cpu),
        Storage: parseInt(form.Storage),
      }),
    })
    if (res.ok) {
      showToast('Server updated.', 'success')
      router.push('/admin/servers')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to update server.', 'error')
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
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Edit Server: {server?.name}</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Modify server settings and configuration.</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link href="/admin/servers"
              className="rounded-xl bg-neutral-200 dark:bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition">
              Back to Servers
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.08}>
          <div id="serverForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">General</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Name:</label>
                  <input className={inputClass} value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Description:</label>
                  <input className={inputClass} placeholder="Server description"
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Server Configuration</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Owner:</label>
                  <select className={selectClass} value={form.ownerId} onChange={e => setField('ownerId', e.target.value)}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Node:</label>
                  <select className={selectClass} value={form.nodeId} onChange={e => setField('nodeId', e.target.value)}>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Image:</label>
                  <select className={selectClass} value={form.imageId} onChange={e => setField('imageId', e.target.value)}>
                    {images.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Resource Allocation</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Memory (MB):</label>
                  <input type="number" min="128" max="131072" className={inputClass}
                    value={form.Memory} onChange={e => setField('Memory', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">CPU Cores:</label>
                  <input type="number" min="1" max="16" className={inputClass}
                    value={form.Cpu} onChange={e => setField('Cpu', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Storage (GB):</label>
                  <input type="number" min="1" max="500" className={inputClass}
                    value={form.Storage} onChange={e => setField('Storage', e.target.value)} />
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Startup Configuration</h2>
              <div className="mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Startup Command:</label>
                  <textarea className={`${inputClass} font-mono resize-none`} rows={3}
                    value={form.StartCommand} onChange={e => setField('StartCommand', e.target.value)} />
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-700/20 rounded-lg p-4 border border-neutral-300 dark:border-white/5 mt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex items-center mb-2 md:mb-0">
                      <Pencil className="h-6 w-6 text-blue-500 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-neutral-800 dark:text-white">Startup Command Permissions</h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">When enabled, users can modify the startup command.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer"
                          checked={form.allowStartupEdit}
                          onChange={e => setField('allowStartupEdit', e.target.checked)} />
                        <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">
                        {form.allowStartupEdit ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Suspension</h2>
              <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-700/20 rounded-lg p-4 border border-neutral-300 dark:border-white/5 mb-6">
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-white">Suspend Server</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Suspended servers cannot be started or controlled by users.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={form.Suspended}
                    onChange={e => setField('Suspended', e.target.checked)} />
                  <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500" />
                </label>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-200 text-white dark:text-neutral-800 px-4 py-2 text-sm font-medium shadow-md transition disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
