'use client'

import { useState, useEffect, use } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

type Tab = 'general' | 'docker' | 'variables' | 'install' | 'raw'

const inputClass = "w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition"
const labelClass = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
const sectionClass = "flex flex-col bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5"
const sectionHeadClass = "text-[13px] font-medium text-neutral-800 dark:text-white px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5"
const smallInputClass = "w-full rounded-lg border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-neutral-700/40 px-2.5 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition"
const smallLabelClass = "block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1"

interface DockerEntry { label: string; image: string }
interface Variable {
  name: string
  env_variable: string
  default_value: string
  field_type: string
  description: string
  rules: string
  user_viewable: boolean
  user_editable: boolean
}

function emptyVariable(): Variable {
  return { name: '', env_variable: '', default_value: '', field_type: 'text', description: '', rules: '', user_viewable: true, user_editable: true }
}

export default function AdminImageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // General fields
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [startup, setStartup] = useState('')
  const [stop, setStop] = useState('stop')
  const [startupDone, setStartupDone] = useState('')

  // Docker tab
  const [dockerEntries, setDockerEntries] = useState<DockerEntry[]>([])

  // Variables tab
  const [variables, setVariables] = useState<Variable[]>([])

  // Install script tab
  const [installContainer, setInstallContainer] = useState('')
  const [installEntrypoint, setInstallEntrypoint] = useState('bash')
  const [installScript, setInstallScript] = useState('')

  // Raw tab
  const [rawJson, setRawJson] = useState('')
  const [rawError, setRawError] = useState('')

  // Full image data for building save payload
  const [imageData, setImageData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetch(`/api/admin/images/${id}`)
      .then(r => r.json())
      .then(d => {
        const img = d.image || d
        setImageData(img)

        setName(img.name || '')
        setAuthor(img.author || '')
        setDescription(img.description || '')
        setStartup(img.startup || '')
        setStop(img.stop || 'stop')
        setStartupDone(img.startup_done || '')

        // Parse docker images: stored as array of {label: value} objects
        try {
          const parsed = JSON.parse(img.dockerImages || '[]')
          if (Array.isArray(parsed)) {
            setDockerEntries(parsed.map((entry: Record<string, string>) => {
              const [label, image] = Object.entries(entry)[0] || ['', '']
              return { label, image }
            }))
          }
        } catch {
          setDockerEntries([])
        }

        // Parse variables
        try {
          const parsed = JSON.parse(img.variables || '[]')
          if (Array.isArray(parsed)) {
            setVariables(parsed.map((v: Record<string, unknown>) => ({
              name: String(v.name || ''),
              env_variable: String(v.env_variable || v.env || ''),
              default_value: String(v.default_value ?? v.value ?? ''),
              field_type: String(v.field_type || v.type || 'text'),
              description: String(v.description || ''),
              rules: String(v.rules || ''),
              user_viewable: v.user_viewable !== false,
              user_editable: v.user_editable !== false,
            })))
          }
        } catch {
          setVariables([])
        }

        // Parse install script
        try {
          const scripts = JSON.parse(img.scripts || '{}')
          const installation = scripts.installation || {}
          setInstallContainer(installation.container || '')
          setInstallEntrypoint(installation.entrypoint || 'bash')
          setInstallScript(installation.script || '')
        } catch {}

        setRawJson(JSON.stringify(img, null, 2))
      })
      .catch(() => showToast('Failed to load image', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function buildPayload() {
    const dockerImagesObj = dockerEntries
      .filter(e => e.label && e.image)
      .reduce<Record<string, string>>((acc, e) => { acc[e.label] = e.image; return acc }, {})

    const dockerImagesArray = Object.entries(dockerImagesObj).map(([k, v]) => ({ [k]: v }))

    const scripts = {
      ...(JSON.parse((imageData.scripts as string) || '{}') || {}),
      installation: {
        container: installContainer,
        entrypoint: installEntrypoint || 'bash',
        script: installScript,
      },
    }

    return {
      name,
      author,
      description,
      startup,
      stop,
      startup_done: startupDone,
      dockerImages: JSON.stringify(dockerImagesArray),
      variables: JSON.stringify(variables),
      scripts: JSON.stringify(scripts),
      info: imageData.info || JSON.stringify({}),
      authorName: imageData.authorName || '',
      config_files: imageData.config_files || '',
    }
  }

  async function handleSave() {
    setSaving(true)
    setRawError('')

    let body: Record<string, unknown>

    if (tab === 'raw') {
      try {
        body = JSON.parse(rawJson)
        body.section = 'raw'
      } catch (e) {
        setRawError('Invalid JSON: ' + String(e))
        setSaving(false)
        return
      }
    } else {
      body = buildPayload()
    }

    const res = await fetch(`/api/admin/images/${id}`, {
      method: 'PUT',
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

  function addDockerEntry() {
    setDockerEntries(prev => [...prev, { label: '', image: '' }])
  }

  function updateDockerEntry(i: number, field: 'label' | 'image', value: string) {
    setDockerEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function removeDockerEntry(i: number) {
    setDockerEntries(prev => prev.filter((_, idx) => idx !== i))
  }

  function addVariable() {
    setVariables(prev => [...prev, emptyVariable()])
  }

  function updateVariable(i: number, field: keyof Variable, value: string | boolean) {
    setVariables(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v))
  }

  function removeVariable(i: number) {
    setVariables(prev => prev.filter((_, idx) => idx !== i))
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
          <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-8 pt-5 flex items-start justify-between">
          <FadeUp>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">{name || 'Edit Image'}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Edit configuration, variables, Docker images, and install scripts.</p>
          </FadeUp>
          <FadeUp delay={0.04} className="flex gap-2 shrink-0 ml-4 mt-0.5">
            <a href={`/api/admin/images/${id}/export`}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
              Export
            </a>
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

            {/* General */}
            {tab === 'general' && (
              <div className="animate-fade-in-up space-y-5">
                <div className={sectionClass}>
                  <h2 className={sectionHeadClass}>Basics</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Author</label>
                      <input type="text" className={inputClass} value={author} onChange={e => setAuthor(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea className={`${inputClass} resize-none`} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className={sectionClass}>
                  <h2 className={sectionHeadClass}>Process</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Startup Command</label>
                      <input type="text" className={`${inputClass} font-mono`} placeholder="e.g. java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}"
                        value={startup} onChange={e => setStartup(e.target.value)} />
                      <p className="mt-1.5 text-xs text-neutral-400">Use <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{'{{VARIABLE_NAME}}'}</code> to reference egg variables.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Stop Command</label>
                      <input type="text" className={`${inputClass} font-mono`} placeholder="stop"
                        value={stop} onChange={e => setStop(e.target.value)} />
                      <p className="mt-1.5 text-xs text-neutral-400">Command sent to stop the container gracefully.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Startup Done Signal</label>
                      <input type="text" className={`${inputClass} font-mono`} placeholder="e.g. For help, type"
                        value={startupDone} onChange={e => setStartupDone(e.target.value)} />
                      <p className="mt-1.5 text-xs text-neutral-400">String in server output that signals the server finished starting.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Docker Images — visual key→value editor */}
            {tab === 'docker' && (
              <div className={`${sectionClass} animate-fade-in-up`}>
                <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5">
                  <h2 className={`${sectionHeadClass} px-0 py-0 bg-transparent border-0 rounded-none`}>Docker Images</h2>
                  <button type="button" onClick={addDockerEntry}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
                    <Plus className="w-3 h-3" />
                    Add Image
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs text-neutral-500 mb-4">Each entry maps a display label to a Docker image reference. The label is what users see in dropdowns.</p>
                  {dockerEntries.length === 0 ? (
                    <p className="text-xs text-neutral-400">No Docker images configured. Click Add Image to add one.</p>
                  ) : (
                    <div className="space-y-2">
                      {dockerEntries.map((entry, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input type="text" placeholder="Label (e.g. Java 21)"
                            className={`${smallInputClass} w-40 shrink-0`}
                            value={entry.label}
                            onChange={e => updateDockerEntry(i, 'label', e.target.value)} />
                          <input type="text" placeholder="Image ref (e.g. ghcr.io/ptero-eggs/yolks:java_21)"
                            className={`${smallInputClass} flex-1 font-mono`}
                            value={entry.image}
                            onChange={e => updateDockerEntry(i, 'image', e.target.value)} />
                          <button type="button" onClick={() => removeDockerEntry(i)}
                            className="shrink-0 p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Variables — visual card editor */}
            {tab === 'variables' && (
              <div className={`${sectionClass} animate-fade-in-up`}>
                <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-100 dark:bg-white/5 rounded-t-xl border-b border-neutral-200 dark:border-white/5">
                  <h2 className={`${sectionHeadClass} px-0 py-0 bg-transparent border-0 rounded-none`}>Egg Variables</h2>
                  <button type="button" onClick={addVariable}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition">
                    <Plus className="w-3 h-3" />
                    Add Variable
                  </button>
                </div>
                <div className="px-5 py-4">
                  <p className="text-xs text-neutral-500 mb-4">
                    Variables are injected as environment variables into the container.{' '}
                    <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">env_variable</code> is the name used in the startup command.
                  </p>
                  {variables.length === 0 ? (
                    <p className="text-xs text-neutral-400">No variables defined. Click Add Variable to add one.</p>
                  ) : (
                    <div className="space-y-3">
                      {variables.map((v, i) => (
                        <div key={i} className="bg-white dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-white/5 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-neutral-400">#{i + 1}</span>
                            <button type="button" onClick={() => removeVariable(i)}
                              className="text-xs text-red-500 hover:text-red-400 transition">Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={smallLabelClass}>Name</label>
                              <input type="text" className={smallInputClass} value={v.name}
                                onChange={e => updateVariable(i, 'name', e.target.value)} />
                            </div>
                            <div>
                              <label className={smallLabelClass}>Env Variable</label>
                              <input type="text" className={`${smallInputClass} font-mono`} placeholder="SERVER_JARFILE" value={v.env_variable}
                                onChange={e => updateVariable(i, 'env_variable', e.target.value)} />
                            </div>
                            <div>
                              <label className={smallLabelClass}>Default Value</label>
                              <input type="text" className={`${smallInputClass} font-mono`} value={v.default_value}
                                onChange={e => updateVariable(i, 'default_value', e.target.value)} />
                            </div>
                            <div>
                              <label className={smallLabelClass}>Field Type</label>
                              <select className={smallInputClass} value={v.field_type}
                                onChange={e => updateVariable(i, 'field_type', e.target.value)}>
                                <option value="text">text</option>
                                <option value="number">number</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className={smallLabelClass}>Description</label>
                              <input type="text" className={smallInputClass} value={v.description}
                                onChange={e => updateVariable(i, 'description', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                              <label className={smallLabelClass}>Validation Rules</label>
                              <input type="text" className={`${smallInputClass} font-mono`} placeholder="required|string|between:3,15" value={v.rules}
                                onChange={e => updateVariable(i, 'rules', e.target.value)} />
                            </div>
                            <div className="col-span-2 flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                                <input type="checkbox" checked={v.user_viewable}
                                  onChange={e => updateVariable(i, 'user_viewable', e.target.checked)}
                                  className="rounded border-neutral-300 dark:border-neutral-600" />
                                User viewable
                              </label>
                              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                                <input type="checkbox" checked={v.user_editable}
                                  onChange={e => updateVariable(i, 'user_editable', e.target.checked)}
                                  className="rounded border-neutral-300 dark:border-neutral-600" />
                                User editable
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Install Script */}
            {tab === 'install' && (
              <div className={`${sectionClass} animate-fade-in-up`}>
                <h2 className={sectionHeadClass}>Installation Script</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-5 py-5">
                  <div>
                    <label className={labelClass}>Container Image</label>
                    <input type="text" className={`${inputClass} font-mono`} placeholder="e.g. eclipse-temurin:21-jdk-jammy"
                      value={installContainer} onChange={e => setInstallContainer(e.target.value)} />
                    <p className="mt-1.5 text-xs text-neutral-400">Docker image the install script runs inside.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Entrypoint</label>
                    <input type="text" className={`${inputClass} font-mono`} placeholder="bash"
                      value={installEntrypoint} onChange={e => setInstallEntrypoint(e.target.value)} />
                    <p className="mt-1.5 text-xs text-neutral-400">Shell that executes the script (usually <code className="font-mono">bash</code>).</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Script</label>
                    <textarea className={`${inputClass} font-mono resize-y`} rows={16}
                      placeholder={'#!/bin/bash\n# Install script runs inside the container\napt update && apt install -y curl'}
                      value={installScript} onChange={e => setInstallScript(e.target.value)} />
                    <p className="mt-1.5 text-xs text-neutral-400">Files are placed in <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 rounded">/mnt/server</code> inside the install container.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Raw JSON */}
            {tab === 'raw' && (
              <div className={`${sectionClass} animate-fade-in-up`}>
                <h2 className={sectionHeadClass}>Raw JSON</h2>
                <div className="px-5 py-5">
                  <p className="text-xs text-neutral-500 mb-3">Edit the complete egg JSON directly. Saving here overwrites all tab values.</p>
                  <textarea className={`${inputClass} font-mono resize-y`} rows={24}
                    value={rawJson} onChange={e => { setRawJson(e.target.value); setRawError('') }} />
                  {rawError && <p className="mt-2 text-xs text-red-500">{rawError}</p>}
                </div>
              </div>
            )}

            <div className="mt-5">
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
