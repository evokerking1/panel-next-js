'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import PanelLayout from '@/components/layout/PanelLayout'
import Modal from '@/components/ui/Modal'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface Node { id: number; name: string; address: string; port: number }
interface DockerVariant { [name: string]: string }
interface Image { id: number; name?: string; description?: string; dockerImages?: string }
interface ResourceLimits { maxMemory: number; maxCpu: number; maxStorage: number }

function Stepper({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  min: number
  max: number
  step: number
  value: string
  onChange: (value: string) => void
}) {
  function adjust(delta: number) {
    const next = Math.min(max, Math.max(min, (parseInt(value || String(min), 10) || min) + delta))
    onChange(String(next))
  }

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500 mb-1.5">
        {label}
      </label>
      <p className="text-[11px] text-neutral-400 mb-2">{hint}</p>
      <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.06]">
        <button
          type="button"
          onClick={() => adjust(-step)}
          className="px-4 py-3 text-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-[0.98] transition"
        >
          -
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent px-2 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-white outline-none"
        />
        <button
          type="button"
          onClick={() => adjust(step)}
          className="px-4 py-3 text-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 active:scale-[0.98] transition"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function CreateServerPage() {
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [nodes, setNodes] = useState<Node[]>([])
  const [images, setImages] = useState<Image[]>([])
  const [limits, setLimits] = useState<ResourceLimits>({ maxMemory: 512, maxCpu: 100, maxStorage: 5 })
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [allowedError, setAllowedError] = useState('')
  const [serverLimit, setServerLimit] = useState(0)
  const [currentCount, setCurrentCount] = useState(0)

  const [form, setForm] = useState({
    name: '',
    description: '',
    nodeId: '',
    imageId: '',
    dockerImage: '',
    Memory: '512',
    Cpu: '100',
    Storage: '5',
  })
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    fetch('/api/user/create-server')
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setAllowed(false)
          setAllowedError(d.error)
          return
        }
        setNodes(d.nodes || [])
        setImages(d.images || [])
        setLimits(d.resourceLimits || { maxMemory: 512, maxCpu: 100, maxStorage: 5 })
        setServerLimit(d.serverLimit || 0)
        setCurrentCount(d.currentCount || 0)
        setAllowed(true)
      })
      .catch(() => {
        setAllowed(false)
        setAllowedError('Failed to load.')
      })
  }, [user])

  function dockerVariants(image: Image | undefined): string[] {
    if (!image?.dockerImages) return []
    try {
      return (JSON.parse(image.dockerImages) as DockerVariant[]).flatMap(Object.keys)
    } catch {
      return []
    }
  }

  const selectedImage = useMemo(
    () => images.find(image => String(image.id) === form.imageId),
    [images, form.imageId],
  )
  const availableVariants = useMemo(() => dockerVariants(selectedImage), [selectedImage])

  useEffect(() => {
    if (!selectedImage) return
    if (!availableVariants.includes(form.dockerImage)) {
      setForm(current => ({ ...current, dockerImage: '' }))
    }
  }, [availableVariants, form.dockerImage, selectedImage])

  async function submit() {
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
      return
    }
    showToast(d.error || 'Failed to create server.', 'error')
    setSubmitting(false)
  }

  const inputClass = 'w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.06] px-3.5 py-3 text-sm text-neutral-900 dark:text-white outline-none transition focus:border-neutral-400 dark:focus:border-white/20'
  const selectClass = `${inputClass} appearance-none pr-10`

  if (allowed === null) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  if (allowed === false) {
    return (
      <PanelLayout>
        <div className="px-4 sm:px-8 pt-6">
          <p className="text-sm text-neutral-500">{allowedError || 'You cannot create servers.'}</p>
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">
        <div className="panel-toolbar">
          <div className="panel-page-heading">
            <h1 className="panel-page-title">Create a server</h1>
            <p className="panel-page-subtitle">
              {currentCount} of {serverLimit} servers used
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-neutral-500 transition active:opacity-60">
            Cancel
          </Link>
        </div>

        <div className="panel-grid-wide">
          <div className="panel-stack">
          <section className="panel-card">
            <div className="border-b border-neutral-100 px-4 py-3 dark:border-white/5">
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">Details</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">Name</label>
                <input
                  className={inputClass}
                  value={form.name}
                  maxLength={64}
                  placeholder="My server"
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">
                  Description <span className="normal-case tracking-normal text-[11px] font-normal text-neutral-400">(optional)</span>
                </label>
                <input
                  className={inputClass}
                  value={form.description}
                  maxLength={128}
                  placeholder="What's this for?"
                  onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="border-b border-neutral-100 px-4 py-3 dark:border-white/5">
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">Node & image</p>
            </div>
            <div className="panel-form-grid p-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">Node</label>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form.nodeId}
                    onChange={e => setForm(current => ({ ...current, nodeId: e.target.value }))}
                  >
                    <option value="">Select a node</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.id}>{node.name}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">⌄</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">Image</label>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form.imageId}
                    onChange={e => setForm(current => ({ ...current, imageId: e.target.value, dockerImage: '' }))}
                  >
                    <option value="">Select an image</option>
                    {images.map(image => (
                      <option key={image.id} value={image.id}>{image.name || `Image #${image.id}`}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">⌄</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.04em] text-neutral-500">Docker variant</label>
                <div className="relative">
                  <select
                    className={selectClass}
                    value={form.dockerImage}
                    disabled={!selectedImage}
                    onChange={e => setForm(current => ({ ...current, dockerImage: e.target.value }))}
                  >
                    <option value="">{selectedImage ? 'Select a variant' : 'Select image first'}</option>
                    {availableVariants.map(variant => (
                      <option key={variant} value={variant}>{variant}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-400">⌄</span>
                </div>
              </div>
            </div>
          </section>
          </div>

          <div className="panel-stack">
          <section className="panel-card">
            <div className="border-b border-neutral-100 px-4 py-3 dark:border-white/5">
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">Resources</p>
            </div>
            <div className="space-y-4 p-4">
              <Stepper
                id="memory"
                label="RAM"
                hint={`Max ${limits.maxMemory} MB`}
                min={128}
                max={limits.maxMemory}
                step={128}
                value={form.Memory}
                onChange={value => setForm(current => ({ ...current, Memory: value }))}
              />
              <Stepper
                id="cpu"
                label="CPU"
                hint={`50% = half a core, max ${limits.maxCpu}%`}
                min={50}
                max={limits.maxCpu}
                step={50}
                value={form.Cpu}
                onChange={value => setForm(current => ({ ...current, Cpu: value }))}
              />
              <Stepper
                id="storage"
                label="Storage"
                hint={`Max ${limits.maxStorage} GB`}
                min={1}
                max={limits.maxStorage}
                step={1}
                value={form.Storage}
                onChange={value => setForm(current => ({ ...current, Storage: value }))}
              />
            </div>
          </section>

          <button
            type="button"
            disabled={submitting}
            onClick={() => setConfirmOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Creating server' : 'Create server'}
          </button>
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Create server?"
        body={`Create "${form.name || 'this server'}" with ${form.Memory || '0'} MB RAM, ${form.Cpu || '0'}% CPU, and ${form.Storage || '0'} GB storage?`}
        confirmLabel="Create"
        danger={false}
        onConfirm={submit}
        onClose={() => setConfirmOpen(false)}
      />
    </PanelLayout>
  )
}
