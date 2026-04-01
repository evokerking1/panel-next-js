'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

type Tab = 'general' | 'docker' | 'variables' | 'install' | 'raw'

const inputClass = "w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition"
const labelClass = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
const sectionClass = "flex flex-col bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5"
const sectionHeadClass = "text-[13px] font-medium text-neutral-800 dark:text-white px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5"

export default function AdminImageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [image, setImage] = useState<Record<string, unknown>>({})
  const [fields, setFields] = useState({
    name: '', author: '', description: '', startup: '', stop: 'stop',
    dockerImages: '[]', variables: '[]', installScript: '', raw: '',
  })

  useEffect(() => {
    fetch(`/api/admin/images/${id}`)
      .then(r => r.json())
      .then(d => {
        const img = d.image || d
        setImage(img)
        setFields({
          name: img.name || '',
          author: img.author || '',
          description: img.description || '',
          startup: img.startup || '',
          stop: img.stop || 'stop',
          dockerImages: img.dockerImages || '[]',
          variables: img.variables || '[]',
          installScript: img.installScript || '',
          raw: JSON.stringify(img, null, 2),
        })
      })
      .catch(() => showToast('Failed to load image', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function setField(k: string, v: string) {
    setFields(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    let body: Record<string, unknown> = {
      name: fields.name,
      author: fields.author,
      description: fields.description,
      startup: fields.startup,
      stop: fields.stop,
      installScript: fields.installScript,
    }
    try { body.dockerImages = fields.dockerImages } catch {}
    try { body.variables = fields.variables } catch {}

    if (tab === 'raw') {
      try { body = { ...body, ...JSON.parse(fields.raw) } } catch { showToast('Invalid JSON in raw tab', 'error'); setSaving(false); return }
    }

    const res = await fetch(`/api/admin/images/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      showToast('Image saved.', 'success')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to save.', 'error')
    }
    setSaving(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'docker', label: 'Docker Images' },
    { key: 'variables', label: 'Variables' },
    { key: 'install', label: 'Install Script' },
    { key: 'raw', label: 'Raw JSON' },
  ]

  if (loading) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto pt-16 pb-12">
        <div className="px-8 pt-5 flex items-start justify-between">
          <FadeUp>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">{fields.name || 'Edit Image'}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Edit egg configuration, variables, Docker images, and install scripts.</p>
          </FadeUp>
          <FadeUp delay={0.04} className="flex gap-2 shrink-0 ml-4">
            <Link href="/admin/images"
              className="px-3 py-2 text-sm font-medium rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
              Back
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div className="px-8 mt-6">
            <div className="flex gap-0.5 mb-6 border-b border-neutral-200 dark:border-neutral-700/40">
              {tabs.map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2 ${
                    tab === t.key
                      ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white'
                      : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'general' && (
              <div className="space-y-5">
                <div className={sectionClass}>
                  <h2 className={sectionHeadClass}>Basics</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input type="text" className={inputClass} value={fields.name} onChange={e => setField('name', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Author</label>
                      <input type="text" className={inputClass} value={fields.author} onChange={e => setField('author', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea className={`${inputClass} resize-none`} rows={2} value={fields.description} onChange={e => setField('description', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className={sectionClass}>
                  <h2 className={sectionHeadClass}>Process</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Startup Command</label>
                      <input type="text" className={`${inputClass} font-mono`} placeholder="e.g. java -Xmx{{SERVER_MEMORY}}M -jar server.jar"
                        value={fields.startup} onChange={e => setField('startup', e.target.value)} />
                      <p className="mt-1.5 text-xs text-neutral-400">Use <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{'{{VARIABLE_NAME}}'}</code> to reference variables.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Stop Command</label>
                      <input type="text" className={`${inputClass} font-mono`} placeholder="stop"
                        value={fields.stop} onChange={e => setField('stop', e.target.value)} />
                      <p className="mt-1.5 text-xs text-neutral-400">Command sent to stop the container gracefully.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'docker' && (
              <div className={sectionClass}>
                <h2 className={sectionHeadClass}>Docker Images</h2>
                <div className="px-5 py-5">
                  <p className="text-xs text-neutral-500 mb-3">JSON array of Docker image strings, e.g. <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">["ghcr.io/org/image:latest"]</code></p>
                  <textarea className={`${inputClass} font-mono resize-y`} rows={8}
                    value={fields.dockerImages} onChange={e => setField('dockerImages', e.target.value)} />
                </div>
              </div>
            )}

            {tab === 'variables' && (
              <div className={sectionClass}>
                <h2 className={sectionHeadClass}>Variables</h2>
                <div className="px-5 py-5">
                  <p className="text-xs text-neutral-500 mb-3">JSON array of variable objects with <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">name</code>, <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">env</code>, <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">default</code>, <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">description</code>.</p>
                  <textarea className={`${inputClass} font-mono resize-y`} rows={12}
                    value={fields.variables} onChange={e => setField('variables', e.target.value)} />
                </div>
              </div>
            )}

            {tab === 'install' && (
              <div className={sectionClass}>
                <h2 className={sectionHeadClass}>Install Script</h2>
                <div className="px-5 py-5">
                  <p className="text-xs text-neutral-500 mb-3">Bash script run during server installation.</p>
                  <textarea className={`${inputClass} font-mono resize-y`} rows={16}
                    value={fields.installScript} onChange={e => setField('installScript', e.target.value)} />
                </div>
              </div>
            )}

            {tab === 'raw' && (
              <div className={sectionClass}>
                <h2 className={sectionHeadClass}>Raw JSON</h2>
                <div className="px-5 py-5">
                  <p className="text-xs text-neutral-500 mb-3">Direct JSON edit. Saved as-is on next save.</p>
                  <textarea className={`${inputClass} font-mono resize-y`} rows={20}
                    value={fields.raw} onChange={e => setField('raw', e.target.value)} />
                </div>
              </div>
            )}

            <div className="mt-5">
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
