'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface ImageData {
  id: number
  UUID: string
  name?: string
  description?: string
  author?: string
  authorName?: string
  startup?: string
  stop?: string
  startup_done?: string
  config_files?: string
  dockerImages?: string
  variables?: string
  scripts?: string
  info?: string
  meta?: string
}

type Tab = 'general' | 'docker' | 'variables' | 'install' | 'raw'

interface Variable {
  name: string
  description?: string
  env_variable: string
  type: 'text' | 'number' | 'boolean'
  default_value?: string
  user_viewable?: boolean
  user_editable?: boolean
  required?: boolean
}

export default function ImageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()

  const [image, setImage] = useState<ImageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('general')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [startup, setStartup] = useState('')
  const [stop, setStop] = useState('stop')
  const [startupDone, setStartupDone] = useState('')
  const [dockerImages, setDockerImages] = useState<{ label: string; image: string }[]>([])
  const [variables, setVariables] = useState<Variable[]>([])
  const [rawJson, setRawJson] = useState('')

  useEffect(() => {
    fetch(`/api/admin/images/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.image) {
          const img = d.image
          setImage(img)
          setName(img.name || '')
          setDescription(img.description || '')
          setAuthor(img.author || '')
          setStartup(img.startup || '')
          setStop(img.stop || 'stop')
          setStartupDone(img.startup_done || '')
          try { setDockerImages(JSON.parse(img.dockerImages || '[]').flatMap((obj: Record<string,string>) => Object.entries(obj).map(([label, image]) => ({ label, image }))) ) } catch { setDockerImages([]) }
          try { setVariables(JSON.parse(img.variables || '[]')) } catch { setVariables([]) }
          setRawJson(JSON.stringify(img, null, 2))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function saveGeneral() {
    setSaving(true)
    const res = await fetch(`/api/admin/images/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'general', name, description, author, startup, stop, startup_done: startupDone }),
    })
    if (res.ok) showToast('Changes saved.', 'success')
    else showToast('Failed to save.', 'error')
    setSaving(false)
  }

  async function saveDockerImages() {
    setSaving(true)
    const asArray = [Object.fromEntries(dockerImages.map(d => [d.label, d.image]))]
    const res = await fetch(`/api/admin/images/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'docker', dockerImages: JSON.stringify(asArray) }),
    })
    if (res.ok) showToast('Docker images saved.', 'success')
    else showToast('Failed to save.', 'error')
    setSaving(false)
  }

  async function saveVariables() {
    setSaving(true)
    const res = await fetch(`/api/admin/images/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'variables', variables: JSON.stringify(variables) }),
    })
    if (res.ok) showToast('Variables saved.', 'success')
    else showToast('Failed to save.', 'error')
    setSaving(false)
  }

  async function saveRaw() {
    setSaving(true)
    try {
      const parsed = JSON.parse(rawJson)
      const res = await fetch(`/api/admin/images/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'raw', ...parsed }),
      })
      if (res.ok) showToast('Raw JSON saved.', 'success')
      else showToast('Failed to save.', 'error')
    } catch {
      showToast('Invalid JSON.', 'error')
    }
    setSaving(false)
  }

  const inputClass = 'w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition'
  const tabClass = (t: Tab) => `px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2 ${tab === t ? 'border-neutral-800 dark:border-white text-neutral-800 dark:text-white' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`

  if (loading) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </PanelLayout>
  )

  if (!image) return (
    <PanelLayout>
      <div className="px-8 pt-6"><p className="text-sm text-neutral-500">Image not found.</p></div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">{image.name || 'Edit Image'}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Edit egg configuration, variables, Docker images, and install scripts.</p>
          </div>
          <Link href="/admin/images" className="px-3 py-2 text-sm font-medium rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
            Back
          </Link>
        </div>

        <div className="flex gap-0.5 border-b border-neutral-200 dark:border-neutral-700/40 mb-6">
          {(['general', 'docker', 'variables', 'install', 'raw'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={tabClass(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'general' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex flex-col bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5">
              <h2 className="text-[13px] font-medium text-neutral-800 dark:text-white px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5">Basics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Author</label>
                  <input type="text" value={author} onChange={e => setAuthor(e.target.value)} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label>
                  <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className={inputClass + ' resize-none'} />
                </div>
              </div>
            </div>

            <div className="flex flex-col bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5">
              <h2 className="text-[13px] font-medium text-neutral-800 dark:text-white px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5">Process</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Startup Command</label>
                  <input type="text" value={startup} onChange={e => setStartup(e.target.value)} placeholder="e.g. java -Xmx{{SERVER_MEMORY}}M -jar server.jar" className={inputClass + ' font-mono'} />
                  <p className="mt-1.5 text-xs text-neutral-400">Use <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{'{{VARIABLE_NAME}}'}</code> to reference egg variables.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Stop Command</label>
                  <input type="text" value={stop} onChange={e => setStop(e.target.value)} placeholder="stop" className={inputClass + ' font-mono'} />
                  <p className="mt-1.5 text-xs text-neutral-400">Command sent to stop the container gracefully.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Startup Done Signal</label>
                  <input type="text" value={startupDone} onChange={e => setStartupDone(e.target.value)} placeholder="e.g. For help, type" className={inputClass + ' font-mono'} />
                  <p className="mt-1.5 text-xs text-neutral-400">String in server output that indicates the server started.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={saveGeneral} disabled={saving} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-60 transition">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'docker' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex flex-col bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5">
              <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5">
                <h2 className="text-[13px] font-medium text-neutral-800 dark:text-white">Docker Images</h2>
                <button onClick={() => setDockerImages(prev => [...prev, { label: '', image: '' }])}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
                  Add Image
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-neutral-500">Each entry maps a display label to a Docker image reference.</p>
                {dockerImages.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" placeholder="Label" value={d.label}
                      onChange={e => setDockerImages(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                      className={inputClass + ' flex-1'} />
                    <input type="text" placeholder="ghcr.io/..." value={d.image}
                      onChange={e => setDockerImages(prev => prev.map((x, j) => j === i ? { ...x, image: e.target.value } : x))}
                      className={inputClass + ' flex-[2] font-mono'} />
                    <button onClick={() => setDockerImages(prev => prev.filter((_, j) => j !== i))}
                      className="px-2.5 rounded-lg border border-neutral-200 dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={saveDockerImages} disabled={saving} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-60 transition">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'variables' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex justify-between items-center">
              <p className="text-sm text-neutral-500">Environment variables passed to the server on startup.</p>
              <button onClick={() => setVariables(prev => [...prev, { name: '', env_variable: '', type: 'text', default_value: '', user_viewable: true, user_editable: true }])}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
                Add Variable
              </button>
            </div>
            {variables.map((v, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 p-4 space-y-3">
                <div className="flex justify-between">
                  <p className="text-xs font-medium text-neutral-500">Variable {i + 1}</p>
                  <button onClick={() => setVariables(prev => prev.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-400 transition">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                    <input type="text" value={v.name} onChange={e => setVariables(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">ENV Variable</label>
                    <input type="text" value={v.env_variable} onChange={e => setVariables(prev => prev.map((x, j) => j === i ? { ...x, env_variable: e.target.value } : x))} className={inputClass + ' font-mono'} placeholder="SERVER_MEMORY" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Type</label>
                    <select value={v.type} onChange={e => setVariables(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value as Variable['type'] } : x))} className={inputClass}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Default Value</label>
                    <input type="text" value={v.default_value || ''} onChange={e => setVariables(prev => prev.map((x, j) => j === i ? { ...x, default_value: e.target.value } : x))} className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-4">
                  {([{ key: 'user_viewable', label: 'User visible' }, { key: 'user_editable', label: 'User editable' }] as const).map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!v[key]}
                        onChange={e => setVariables(prev => prev.map((x, j) => j === i ? { ...x, [key]: e.target.checked } : x))}
                        className="rounded" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {variables.length > 0 && (
              <div className="flex justify-end">
                <button onClick={saveVariables} disabled={saving} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-60 transition">
                  {saving ? 'Saving…' : 'Save Variables'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'install' && (
          <div className="max-w-3xl">
            <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 p-5">
              <p className="text-sm text-neutral-500">Install scripts are managed via the raw JSON editor or through the egg import system.</p>
            </div>
          </div>
        )}

        {tab === 'raw' && (
          <div className="space-y-4 max-w-4xl">
            <p className="text-xs text-neutral-500">Edit the raw JSON representation of this image. Invalid JSON will not be saved.</p>
            <textarea
              value={rawJson}
              onChange={e => setRawJson(e.target.value)}
              rows={30}
              className="w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-4 py-3 text-xs text-neutral-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition resize-y"
              spellCheck={false}
            />
            <div className="flex justify-end">
              <button onClick={saveRaw} disabled={saving} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-60 transition">
                {saving ? 'Saving…' : 'Save Raw JSON'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  )
}
