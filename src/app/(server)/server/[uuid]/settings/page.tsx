'use client'

import { use, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/panel/server/ServerTabs'
import InstallBanner from '@/components/panel/server/InstallBanner'
import Modal from '@/components/ui/Modal'
import { normalizeHost } from '@/lib/server/network-address'
import { getPrimaryPortFromJson } from '@/lib/server/server-ports'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface ServerData {
  id: number
  UUID: string
  name: string
  description?: string
  Memory: number
  Cpu: number
  Storage: number
  Ports: string
  Suspended: boolean
  node: { name: string; address: string; port: number }
  image: { name: string }
  owner: { username?: string; email: string }
}

interface SftpCredentials {
  username: string
  password: string
  host: string
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300 break-all">{value}</p>
    </div>
  )
}

export default function ServerSettingsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerData | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sftpCredentials, setSftpCredentials] = useState<SftpCredentials | null>(null)
  const [fetchingSftp, setFetchingSftp] = useState(false)
  const [showSftpPassword, setShowSftpPassword] = useState(false)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setName(d.server.name)
          setDescription(d.server.description || '')
        }
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function saveSettings(e: FormEvent) {
    e.preventDefault()
    if (!server) return
    setSaving(true)
    try {
      const res = await fetch(`/api/server/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', name, description }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setServer(current => current ? { ...current, name, description } : current)
        showToast('Settings saved.', 'success')
      } else {
        showToast(data.error || 'Failed to save.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteServer() {
    if (!server || !user?.isAdmin) return
    const res = await fetch(`/api/admin/servers/${server.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Server deleted.', 'success')
      window.location.href = '/dashboard'
    } else {
      showToast('Failed to delete server.', 'error')
    }
  }

  async function getSftpCredentials() {
    setFetchingSftp(true)
    setSftpCredentials(null)
    try {
      const res = await fetch(`/api/server/${uuid}/sftp`, { method: 'POST' })
      const d = await res.json()
      if (res.ok && d.credentials) {
        setSftpCredentials(d.credentials)
      } else {
        showToast(d.error || 'Failed to get SFTP credentials.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setFetchingSftp(false)
    }
  }

  if (loading) {
    return (
      <PanelLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  const primaryPort = getPrimaryPortFromJson(server?.Ports)

  const inputClass = 'w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-100 dark:bg-neutral-700/30 px-3 py-2 text-sm text-neutral-800 dark:text-white outline-none transition focus:ring-1 focus:ring-neutral-400'

  return (
    <PanelLayout>
      <FadeUp>
        <div className="px-4 sm:px-8 pt-4 pb-2">
          <p className="text-base font-medium text-neutral-800 dark:text-white">Settings</p>
        </div>
      </FadeUp>
      <ServerTabs uuid={uuid} features={features} />
      <FadeUp delay={0.06}>
        <InstallBanner uuid={uuid} installing={installing} />
        <div className="panel-page panel-stack">
          <div className="panel-grid-wide">
          <section className="panel-card">
            <div className="panel-card-header">
              <h2 className="mb-1 text-sm font-medium text-neutral-800 dark:text-white">Server Settings</h2>
              <p className="text-xs text-neutral-500">Configure your server&apos;s basic settings.</p>
            </div>
            <div className="panel-card-body">
            <form onSubmit={saveSettings} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Server Name</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">Description</label>
                <input
                  type="text"
                  className={inputClass}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
            </div>
          </section>

          <div className="panel-stack">
          <section className="panel-card">
            <div className="panel-card-header">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Server Information</h2>
            </div>
            <div className="panel-card-body">
            <div className="panel-info-grid">
              <Field label="Node" value={server?.node.name || 'Unknown'} />
              <Field label="Image" value={server?.image.name || 'Unknown'} />
              <Field label="Memory" value={`${server?.Memory ?? 0} MB`} />
              <Field label="CPU" value={`${server?.Cpu ?? 0}%`} />
              <Field label="Storage" value={`${server?.Storage ?? 0} GB`} />
              <Field label="Status" value={server?.Suspended ? 'Suspended' : 'Active'} />
              <Field label="Address" value={`${server ? normalizeHost(server.node.address) : 'Unknown'}:${primaryPort ?? '?'}`} />
              <Field label="Owner" value={server?.owner.username || server?.owner.email || 'Unknown'} />
              <div className="col-span-2 md:col-span-1">
                <Field label="Server ID" value={server?.UUID || uuid} />
              </div>
            </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-card-header">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-neutral-800 dark:text-white">SFTP Access</h2>
                <p className="text-xs text-neutral-500">Get temporary credentials to connect via SFTP.</p>
              </div>
              <button
                type="button"
                onClick={getSftpCredentials}
                disabled={fetchingSftp}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {fetchingSftp ? 'Fetching...' : 'Get Credentials'}
              </button>
            </div>
            </div>
            <div className="panel-card-body">
            {sftpCredentials && (
              <div className="panel-info-grid">
                <Field label="Host" value={sftpCredentials.host} />
                <Field label="Username" value={sftpCredentials.username} />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Password</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {showSftpPassword ? sftpCredentials.password : '••••••••••••'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSftpPassword(current => !current)}
                      className="inline-flex items-center gap-1 text-xs text-neutral-500 transition hover:text-neutral-800 dark:hover:text-white"
                    >
                      {showSftpPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showSftpPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </section>
          </div>
          </div>

          <section className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/20 dark:bg-red-950/20">
            <h2 className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">Danger Zone</h2>
            <div className="space-y-3">
              {user?.isAdmin && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Delete Server</p>
                      <p className="text-xs text-neutral-500">Permanently delete this server and all its data.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="h-px bg-red-200 dark:bg-red-800/30" />
                </>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Reinstall Server</p>
                  <p className="text-xs text-neutral-500">Reinstall from scratch. Backend support is not available in this app yet.</p>
                </div>
                <button
                  type="button"
                  disabled
                  className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white opacity-50"
                >
                  Reinstall
                </button>
              </div>
            </div>
          </section>
        </div>

        <Modal
          open={deleteOpen}
          title="Delete server?"
          body={`Permanently delete "${server?.name}"? This cannot be undone.`}
          confirmLabel="Delete Server"
          onConfirm={deleteServer}
          onClose={() => setDeleteOpen(false)}
        />
      </FadeUp>
    </PanelLayout>
  )
}
