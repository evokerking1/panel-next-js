'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface ServerVariable {
  name: string
  description?: string
  env_variable?: string
  env?: string
  type: 'boolean' | 'text' | 'number'
  default_value?: string | number | boolean
  value?: string | number | boolean
  user_viewable?: boolean
  user_editable?: boolean
}

interface DockerImage { [label: string]: string }

interface ServerData {
  UUID: string
  name: string
  description?: string
  StartCommand: string
  allowStartupEdit: boolean
  dockerImage?: string
}

function Inner({ uuid }: { uuid: string }) {
  const { showToast } = useToastContext()
  const [server, setServer] = useState<ServerData | null>(null)
  const [vars, setVars] = useState<ServerVariable[]>([])
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([])
  const [startCmd, setStartCmd] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/server/${uuid}/startup`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStartCmd(d.server.StartCommand || '')
          setSelectedImage(d.server.dockerImage || '')
        }
        if (d.variables) setVars(d.variables)
        if (d.dockerImages) setDockerImages(d.dockerImages)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function saveCommand(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-command', startCommand: startCmd }),
    })
    if (res.ok) showToast('Startup command saved.', 'success')
    else { const d = await res.json(); showToast(d.error || 'Failed.', 'error') }
    setSaving(false)
  }

  async function saveDockerImage() {
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-docker-image', dockerImage: selectedImage }),
    })
    if (res.ok) showToast('Docker image updated.', 'success')
    else showToast('Failed to update image.', 'error')
  }

  async function saveVariables() {
    setSaving(true)
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-variables', variables: vars }),
    })
    if (res.ok) showToast('Variables saved.', 'success')
    else showToast('Failed to save variables.', 'error')
    setSaving(false)
  }

  function updateVar(idx: number, value: string | boolean) {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, value: String(value) } : v))
  }

  const inputClass = "w-full rounded-xl text-sm px-4 py-2.5 bg-neutral-100 dark:bg-neutral-600/20 border border-neutral-200 dark:border-white/5 text-neutral-800 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-600 outline-none transition"
  const inputMono = inputClass + ' font-mono'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  )

  const allDockerOptions = dockerImages.flatMap(obj => Object.entries(obj).map(([label, image]) => ({ label, image })))

  return (
    <div className="px-4 sm:px-8 pt-4 pb-8 space-y-6">
      {/* Startup command */}
      <form onSubmit={saveCommand} className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
        <h2 className="text-sm font-semibold mb-1 text-neutral-800 dark:text-white">Startup Command</h2>
        <p className="text-xs text-neutral-500 mb-4">The command used to start this server. Changes take effect on next restart.</p>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Start command</label>
        <input type="text" value={startCmd} onChange={e => setStartCmd(e.target.value)}
          disabled={!server?.allowStartupEdit}
          className={inputMono} placeholder="java -jar server.jar" />
        {!server?.allowStartupEdit && (
          <p className="text-xs text-neutral-400 mt-2">Startup editing is disabled. Contact an admin.</p>
        )}
        {server?.allowStartupEdit && (
          <button type="submit" disabled={saving}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save command'}
          </button>
        )}
      </form>

      {/* Docker image */}
      {allDockerOptions.length > 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
          <h2 className="text-sm font-semibold mb-1 text-neutral-800 dark:text-white">Docker Image</h2>
          <p className="text-xs text-neutral-500 mb-4">Select the docker image to run this server with.</p>
          <select value={selectedImage} onChange={e => setSelectedImage(e.target.value)} className={inputClass}>
            {allDockerOptions.map(({ label, image }) => (
              <option key={image} value={image}>{label}</option>
            ))}
          </select>
          <button onClick={saveDockerImage}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
            Update image
          </button>
        </div>
      )}

      {/* Variables */}
      {vars.filter(v => v.user_viewable !== false).length > 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
          <h2 className="text-sm font-semibold mb-1 text-neutral-800 dark:text-white">Environment Variables</h2>
          <p className="text-xs text-neutral-500 mb-4">Variables passed to your server on startup.</p>
          <div className="space-y-4">
            {vars.filter(v => v.user_viewable !== false).map((v, i) => {
              const canEdit = v.user_editable !== false
              const key = v.env_variable || v.env || v.name
              const realIdx = vars.indexOf(v)
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{v.name}</label>
                    <span className="text-[10px] font-mono text-neutral-400">{key}</span>
                  </div>
                  {v.description && <p className="text-xs text-neutral-500 mb-1.5">{v.description}</p>}
                  {v.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" disabled={!canEdit}
                        checked={String(v.value) === 'true' || v.value === true}
                        onChange={e => updateVar(realIdx, e.target.checked)}
                        className="rounded" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Enabled</span>
                    </label>
                  ) : (
                    <input type={v.type === 'number' ? 'number' : 'text'}
                      value={String(v.value ?? v.default_value ?? '')}
                      onChange={e => updateVar(realIdx, e.target.value)}
                      disabled={!canEdit}
                      className={inputClass}
                      placeholder={String(v.default_value ?? '')} />
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={saveVariables} disabled={saving}
            className="mt-5 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save variables'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ServerStartupPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  return (
    <PanelLayout>
      <FadeUp>
      <div className="px-4 sm:px-8 pt-4 pb-2">
        <p className="text-base font-medium text-neutral-800 dark:text-white">Startup</p>
      </div>
      </FadeUp>
      <ServerTabs uuid={uuid} />
      <FadeUp delay={0.06}><div className="mt-4"><Inner uuid={uuid} /></div></FadeUp>
    </PanelLayout>
  )
}
