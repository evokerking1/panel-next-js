'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface Node { id: number; name: string; address: string; port: number }
interface DockerVariant { [name: string]: string }
interface Image { id: number; name?: string; description?: string; dockerImages?: string }
interface ResourceLimits { maxMemory: number; maxCpu: number; maxStorage: number }

export default function CreateServerPage() {
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [nodes, setNodes] = useState<Node[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [limits, setLimits] = useState<ResourceLimits>({ maxMemory: 512, maxCpu: 100, maxStorage: 5 })
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [allowedError, setAllowedError] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', nodeId: '', imageId: '', dockerImage: '',
    Memory: '512', Cpu: '100', Storage: '5',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch('/api/user/create-server')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setAllowed(false); setAllowedError(d.error); return; }
        setNodes(d.nodes)
        setImages(d.images)
        setLimits(d.resourceLimits)
        setAllowed(true)
      })
      .catch(() => { setAllowed(false); setAllowedError('Failed to load.') })
  }, [user])

  function dockerVariants(image: Image | undefined): string[] {
    if (!image?.dockerImages) return []
    try { return (JSON.parse(image.dockerImages) as DockerVariant[]).flatMap(Object.keys) } catch { return [] }
  }

  const selectedImage = images.find(i => String(i.id) === form.imageId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/user/create-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Server created.', 'success')
      router.push(`/server/${d.serverUUID}`)
    } else {
      showToast(d.error || 'Failed to create server.', 'error')
      setSubmitting(false)
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  if (allowed === null) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
      </div>
    </PanelLayout>
  )

  if (allowed === false) return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6">
        <p className="text-sm text-neutral-500">{allowedError || 'You cannot create servers.'}</p>
      </div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Create server</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Deploy a new server within your allocated limits</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Name</label>
            <input required className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My server" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Description <span className="text-neutral-400">(optional)</span></label>
            <input className={inputClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Node</label>
              <select required className={inputClass} value={form.nodeId} onChange={e => setForm(f => ({ ...f, nodeId: e.target.value }))}>
                <option value="">Select a node</option>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Image</label>
              <select required className={inputClass} value={form.imageId} onChange={e => setForm(f => ({ ...f, imageId: e.target.value, dockerImage: '' }))}>
                <option value="">Select an image</option>
                {images.map(i => <option key={i.id} value={i.id}>{i.name || `Image #${i.id}`}</option>)}
              </select>
            </div>
          </div>

          {selectedImage && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Docker variant</label>
              <select required className={inputClass} value={form.dockerImage} onChange={e => setForm(f => ({ ...f, dockerImage: e.target.value }))}>
                <option value="">Select a variant</option>
                {dockerVariants(selectedImage).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Memory (MB)</label>
              <input required type="number" min={128} max={limits.maxMemory} className={inputClass}
                value={form.Memory} onChange={e => setForm(f => ({ ...f, Memory: e.target.value }))} />
              <p className="text-[10px] text-neutral-400 mt-1">Max: {limits.maxMemory} MB</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">CPU (%)</label>
              <input required type="number" min={50} max={limits.maxCpu} className={inputClass}
                value={form.Cpu} onChange={e => setForm(f => ({ ...f, Cpu: e.target.value }))} />
              <p className="text-[10px] text-neutral-400 mt-1">Max: {limits.maxCpu}%</p>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Storage (GB)</label>
              <input required type="number" min={1} max={limits.maxStorage} className={inputClass}
                value={form.Storage} onChange={e => setForm(f => ({ ...f, Storage: e.target.value }))} />
              <p className="text-[10px] text-neutral-400 mt-1">Max: {limits.maxStorage} GB</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition"
          >
            {submitting ? 'Creating...' : 'Create server'}
          </button>
        </form>
      </div>
    </PanelLayout>
  )
}
