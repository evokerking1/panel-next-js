'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import LoadingPopup from '@/components/ui/LoadingPopup'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"
const selectClass = "rounded-xl text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 border border-neutral-800/10 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-white/20"

interface Node { id: number; name: string; address: string }
interface User { id: number; username: string }
interface Image { id: number; name: string; dockerImages?: string; variables?: string }

export default function AdminServerCreatePage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [nodes, setNodes] = useState<Node[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [images, setImages] = useState<Image[]>([])

  const [form, setForm] = useState({
    name: '', description: '', ownerId: '', nodeId: '', imageId: '',
    Cpu: '2', Memory: '1024', Storage: '20',
    StartCommand: '', dockerImage: '',
  })

  const [popup, setPopup] = useState<{ open: boolean; message: string; state: 'loading' | 'done' | 'error' }>({
    open: false, message: '', state: 'loading',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/nodes').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/images').then(r => r.json()),
    ]).then(([nd, ud, id]) => {
      setNodes(nd.nodes || [])
      setUsers(ud.users || [])
      setImages(id.images || [])
      const firstNode = nd.nodes?.[0]
      const firstUser = ud.users?.[0]
      const firstImage = id.images?.[0]
      setForm(f => ({
        ...f,
        nodeId: firstNode ? String(firstNode.id) : '',
        ownerId: firstUser ? String(firstUser.id) : '',
        imageId: firstImage ? String(firstImage.id) : '',
        dockerImage: firstImage?.dockerImages ? JSON.parse(firstImage.dockerImages)[0] || '' : '',
      }))
    }).catch(() => showToast('Failed to load data', 'error'))
  }, [])

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleImageChange(imageId: string) {
    const img = images.find(i => String(i.id) === imageId)
    let dockerImage = ''
    if (img?.dockerImages) {
      try { dockerImage = JSON.parse(img.dockerImages)[0] || '' } catch {}
    }
    let startCommand = ''
    if (img?.variables) {
      try {
        const parsed = JSON.parse(img.variables)
        startCommand = parsed.startup || ''
      } catch {}
    }
    setForm(f => ({ ...f, imageId, dockerImage, StartCommand: startCommand }))
  }

  async function handleCreate() {
    if (!form.name || !form.nodeId || !form.ownerId || !form.imageId) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    setPopup({ open: true, message: 'Creating server...', state: 'loading' })
    const res = await fetch('/api/admin/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        ownerId: parseInt(form.ownerId),
        nodeId: parseInt(form.nodeId),
        imageId: parseInt(form.imageId),
        Cpu: parseInt(form.Cpu),
        Memory: parseInt(form.Memory),
        Storage: parseInt(form.Storage),
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setPopup({ open: true, message: 'Server created successfully!', state: 'done' })
      showToast('Server created.', 'success')
      setTimeout(() => { setPopup(p => ({ ...p, open: false })); router.push('/admin/servers') }, 1000)
    } else {
      setPopup({ open: true, message: d.error || 'Failed to create server', state: 'error' })
      showToast(d.error || 'Failed to create server.', 'error')
    }
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Create Server</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Deploy a new server on a node</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div id="nodeForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">General</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Name:</label>
                  <input className={inputClass} placeholder="Server name"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Description:</label>
                  <input className={inputClass} placeholder="Server description"
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">User:</label>
                  <select className={selectClass} value={form.ownerId} onChange={e => setField('ownerId', e.target.value)}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Node:</label>
                  <select className={selectClass} value={form.nodeId} onChange={e => setField('nodeId', e.target.value)}>
                    <option value="">Select node</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
                  </select>
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Resources</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">CPU (Cores):</label>
                  <input type="number" min="1" max="128" className={inputClass}
                    value={form.Cpu} onChange={e => setField('Cpu', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Memory (MB):</label>
                  <input type="number" min="128" max="131072" className={inputClass}
                    value={form.Memory} onChange={e => setField('Memory', e.target.value)} />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Storage (GB):</label>
                  <input type="number" min="1" max="1000" className={inputClass}
                    value={form.Storage} onChange={e => setField('Storage', e.target.value)} />
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Startup</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Image:</label>
                  <select className={selectClass} value={form.imageId} onChange={e => handleImageChange(e.target.value)}>
                    <option value="">Select image</option>
                    {images.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Docker Image:</label>
                  <input className={inputClass} placeholder="e.g. ghcr.io/..."
                    value={form.dockerImage} onChange={e => setField('dockerImage', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Startup Command:</label>
                  <textarea className={`${inputClass} font-mono resize-none`} rows={3}
                    value={form.StartCommand} onChange={e => setField('StartCommand', e.target.value)} />
                </div>
              </div>

              <button onClick={handleCreate} type="button"
                className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-200 text-white dark:text-neutral-800 px-4 py-2 text-sm font-medium shadow-md transition">
                Create Server
              </button>
            </div>
          </div>
        </FadeUp>

        <LoadingPopup
          open={popup.open}
          title="Creating Server"
          message={popup.message}
          state={popup.state}
          onHide={() => setPopup(p => ({ ...p, open: false }))}
        />
      </div>
    </PanelLayout>
  )
}
