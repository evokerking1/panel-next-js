'use client'

import { useState, useEffect, use, useMemo } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/panel/server/ServerTabs'
import InstallBanner from '@/components/panel/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Lock } from 'lucide-react'

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

interface DockerImage {
  [label: string]: string
}

interface ServerData {
  UUID: string
  name: string
  description?: string
  StartCommand: string
  allowStartupEdit: boolean
}

function RenderedCommand({ command, vars }: { command: string; vars: ServerVariable[] }) {
  const values = new Map(
    vars.map(variable => [
      variable.env_variable || variable.env || variable.name,
      String(variable.value ?? variable.default_value ?? ''),
    ])
  )

  const parts = command.split(/(\$ALVKT\([^)]+\))/g)

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-100 dark:bg-neutral-700/30 px-4 py-3 text-sm font-mono text-neutral-800 dark:text-white break-words">
      {parts.map((part, index) => {
        const match = /^\$ALVKT\(([^)]+)\)$/.exec(part)
        if (!match) return <span key={index}>{part}</span>

        const key = match[1]
        const value = values.get(key) || key

        return (
          <span key={index} className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            {value}
          </span>
        )
      })}
    </div>
  )
}

function StartupInner({ uuid }: { uuid: string }) {
  const { showToast } = useToastContext()
  const [server, setServer] = useState<ServerData | null>(null)
  const [vars, setVars] = useState<ServerVariable[]>([])
  const [dockerImages, setDockerImages] = useState<DockerImage[]>([])
  const [startCmd, setStartCmd] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [savingCommand, setSavingCommand] = useState(false)
  const [savingVars, setSavingVars] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/server/${uuid}/startup`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStartCmd(d.server.StartCommand || '')
          setSelectedImage(d.currentDockerImage || '')
        }
        if (d.variables) setVars(d.variables)
        if (d.dockerImages) setDockerImages(d.dockerImages)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function saveCommand(e: React.FormEvent) {
    e.preventDefault()
    setSavingCommand(true)
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-command', startCommand: startCmd }),
    })
    if (res.ok) showToast('Startup command saved.', 'success')
    else {
      const d = await res.json().catch(() => ({}))
      showToast(d.error || 'Failed.', 'error')
    }
    setSavingCommand(false)
  }

  async function saveDockerImage() {
    setSavingImage(true)
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-docker-image', dockerImage: selectedImage }),
    })
    if (res.ok) showToast('Docker image updated.', 'success')
    else showToast('Failed to update image.', 'error')
    setSavingImage(false)
  }

  async function saveVariables() {
    setSavingVars(true)
    const res = await fetch(`/api/server/${uuid}/startup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-variables', variables: vars }),
    })
    if (res.ok) showToast('Variables saved.', 'success')
    else showToast('Failed to save variables.', 'error')
    setSavingVars(false)
  }

  function updateVar(idx: number, value: string | boolean) {
    setVars(prev => prev.map((v, i) => i === idx ? { ...v, value: String(value) } : v))
  }

  const inputClass = 'w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800/50 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition'
  const visibleVars = vars.filter(v => v.user_viewable !== false)
  const dockerOptions = useMemo(
    () => dockerImages.flatMap(obj => Object.entries(obj).map(([label, image]) => ({ label, image }))),
    [dockerImages]
  )

  if (loading) {
    return (
      <div className="animate-fade-in-up px-4 pb-8 lg:px-8">
        <div className="space-y-4">
          {[0, 1, 2].map(index => (
            <div key={index} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-5">
              <div className="skeleton h-4 w-40 mb-2" />
              <div className="skeleton h-3 w-56 mb-4" />
              <div className="skeleton h-11 w-full mb-3" />
              <div className="skeleton h-9 w-28" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="panel-page panel-stack">
      <div className="panel-grid-wide">
        <div className="panel-stack">
        <div className="panel-card">
          <div className="panel-card-header flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-white">Startup Command</p>
              <p className="text-xs text-neutral-500 mt-0.5">Customize the command used to start your server.</p>
            </div>
            {server?.allowStartupEdit ? (
              <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20 shrink-0 ml-3">
                Editing enabled
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 shrink-0 ml-3">
                Editing disabled
              </span>
            )}
          </div>

          <form onSubmit={saveCommand}>
            <div className="panel-card-body">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Rendered command</label>
              <RenderedCommand command={startCmd} vars={visibleVars} />

              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-4 mb-1.5">Startup command</label>
              <textarea
                rows={3}
                value={startCmd}
                onChange={e => setStartCmd(e.target.value)}
                disabled={!server?.allowStartupEdit}
                className={`${inputClass} font-mono ${!server?.allowStartupEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <p className="text-xs text-neutral-500 mt-2">
                {server?.allowStartupEdit
                  ? 'Use $ALVKT(VARIABLE_NAME) to reference environment variables.'
                  : 'Contact an administrator to enable startup command editing.'}
              </p>
            </div>

            <div className="panel-card-footer">
              <button
                type="submit"
                disabled={!server?.allowStartupEdit || savingCommand}
                className={`rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition active:scale-[0.96] transition-transform duration-100 ${!server?.allowStartupEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {savingCommand ? 'Saving...' : 'Save Command'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel-card">
          <div className="panel-card-header flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-white">Docker Image</p>
              <p className="text-xs text-neutral-500 mt-0.5">Change the Docker image used by your server.</p>
            </div>
            <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 shrink-0 ml-3">
              Requires restart
            </span>
          </div>

          <div className="panel-card-body">
            {dockerOptions.length <= 1 ? (
              <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-neutral-700/30 px-4 py-2.5 text-sm text-neutral-800 dark:text-white">
                {dockerOptions[0]?.label || 'No images available'}
              </div>
            ) : (
              <>
                <select value={selectedImage} onChange={e => setSelectedImage(e.target.value)} className={inputClass}>
                  {dockerOptions.map(({ label, image }) => (
                    <option key={image} value={image}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-2">Changing the image will restart your server if it is running.</p>
              </>
            )}
          </div>

          <div className="panel-card-footer">
            <button
              type="button"
              onClick={saveDockerImage}
              disabled={dockerOptions.length <= 1 || savingImage}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition active:scale-[0.96] transition-transform duration-100 disabled:opacity-50"
            >
              {savingImage ? 'Updating...' : 'Update Image'}
            </button>
          </div>
        </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <p className="text-sm font-medium text-neutral-800 dark:text-white">Server Variables</p>
            <p className="text-xs text-neutral-500 mt-0.5">Configure environment variables for your server.</p>
          </div>

          <div className="panel-card-body space-y-4">
            {visibleVars.length > 0 ? (
              visibleVars.map((variable, index) => {
                const canEdit = variable.user_editable !== false
                const envKey = variable.env_variable || variable.env || variable.name
                const realIndex = vars.indexOf(variable)
                return (
                  <div key={`${envKey}-${index}`} className="rounded-xl bg-neutral-100 dark:bg-neutral-700/20 border border-neutral-200 dark:border-white/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">{variable.name}</label>
                      <span className="text-[10px] text-neutral-500 font-mono">ENV: {envKey}</span>
                      {!canEdit && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                          <Lock className="w-3 h-3" />
                          Read-only
                        </span>
                      )}
                    </div>
                    {variable.description && <p className="text-xs text-neutral-500 mb-2">{variable.description}</p>}
                    {variable.type === 'boolean' ? (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={String(variable.value) === 'true' || variable.value === true}
                          disabled={!canEdit}
                          onChange={e => updateVar(realIndex, e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600"
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {String(variable.value) === 'true' || variable.value === true ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    ) : (
                      <input
                        type={variable.type === 'number' ? 'number' : 'text'}
                        value={String(variable.value ?? variable.default_value ?? '')}
                        onChange={e => updateVar(realIndex, e.target.value)}
                        disabled={!canEdit}
                        className={`${inputClass} ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    )}
                    <p className="text-[10px] text-neutral-500 mt-2">Type: {variable.type}</p>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-neutral-500">No variables available for this server.</p>
            )}
          </div>

          <div className="panel-card-footer">
            <button
              type="button"
              onClick={saveVariables}
              disabled={savingVars || visibleVars.length === 0}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition active:scale-[0.96] transition-transform duration-100 disabled:opacity-50"
            >
              {savingVars ? 'Saving...' : 'Save Variables'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServerStartupPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
  }, [uuid])

  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8 lg:pt-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Startup</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Configure startup command, image, and variables</p>
          </div>
        </div>
      </div>
      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />
      <StartupInner uuid={uuid} />
    </PanelLayout>
  )
}
