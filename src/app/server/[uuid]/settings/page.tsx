'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
  Installing: boolean
  Queued: boolean
  node: { name: string; address: string; port: number }
  image: { name: string }
  owner: { username?: string; email: string }
}

interface SftpCredentials {
  username: string
  password: string
  host: string
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5 mb-5 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors duration-150">
      <h2 className="text-sm font-semibold mb-1 text-neutral-800 dark:text-white">{title}</h2>
      {desc && <p className="text-xs text-neutral-500 mb-4">{desc}</p>}
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 font-mono">{value}</p>
    </div>
  )
}

export default function ServerSettingsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [server, setServer] = useState<ServerData | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sftpCredentials, setSftpCredentials] = useState<SftpCredentials | null>(null)
  const [fetchingSftp, setFetchingSftp] = useState(false)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setName(d.server.name)
          setDescription(d.server.description || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!server) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          nodeId: server.node,
          imageId: server.image,
          Memory: server.Memory,
          Cpu: server.Cpu,
          Storage: server.Storage,
          ownerId: server.owner,
          Suspended: server.Suspended,
        }),
      })
      if (res.ok) {
        setServer(s => s ? { ...s, name, description } : s)
        showToast('Settings saved.', 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    }
    setSaving(false)
  }

  async function deleteServer() {
    if (!server || !user?.isAdmin) return
    const res = await fetch(`/api/admin/servers/${server.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Server deleted.', 'success')
      router.push('/dashboard')
    } else {
      showToast('Failed to delete server.', 'error')
    }
    setDeleteOpen(false)
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

  const inputClass = "w-full rounded-xl text-sm px-4 py-2 bg-neutral-100 dark:bg-neutral-600/20 border border-neutral-200 dark:border-white/5 text-neutral-800 dark:text-white focus:border-neutral-400 dark:focus:border-neutral-600 outline-none transition"

  if (loading) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
      </div>
    </PanelLayout>
  )

  const primaryPort = (() => {
    try {
      const ports = JSON.parse(server?.Ports || '[]')
      return ports.find((p: { primary: boolean }) => p.primary)?.Port
    } catch { return undefined }
  })()

  return (
    <PanelLayout>
      <FadeUp>
      <div className="px-4 sm:px-8 pt-4 pb-2">
        <p className="text-base font-medium text-neutral-800 dark:text-white">Settings</p>
      </div>
      </FadeUp>
      <ServerTabs uuid={uuid} />
      <FadeUp delay={0.06}>
      <InstallBanner uuid={uuid} installing={(server?.Installing ?? false) || (server?.Queued ?? false)} />
      <div className="px-4 sm:px-8 mt-4 pb-8">
        <form onSubmit={saveSettings}>
          <Section title="General" desc="Basic server information.">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Server Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={inputClass} placeholder="No description" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </Section>
        </form>

        <Section title="Server Information" desc="Read-only details about this server.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoRow label="UUID" value={uuid} />
            <InfoRow label="Node" value={server?.node.name || '—'} />
            <InfoRow label="Image" value={server?.image.name || '—'} />
            <InfoRow label="Memory" value={`${server?.Memory ?? 0} MB`} />
            <InfoRow label="CPU" value={`${server?.Cpu ?? 0}%`} />
            <InfoRow label="Storage" value={`${server?.Storage ?? 0} GB`} />
            <InfoRow label="Address" value={`${server?.node.address}:${primaryPort ?? '?'}`} />
            <InfoRow label="Owner" value={server?.owner.username || server?.owner.email || '—'} />
            <InfoRow label="Status" value={server?.Suspended ? 'Suspended' : 'Active'} />
          </div>
        </Section>

        <Section title="SFTP Access" desc="Get temporary credentials to connect via SFTP.">
          <button type="button" onClick={getSftpCredentials} disabled={fetchingSftp}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition flex items-center gap-2">
            {fetchingSftp && <Loader2 className="w-4 h-4 animate-spin" />}
            {fetchingSftp ? 'Fetching...' : 'Get SFTP credentials'}
          </button>
          {sftpCredentials && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoRow label="Host" value={sftpCredentials.host} />
              <InfoRow label="Username" value={sftpCredentials.username} />
              <InfoRow label="Password" value={sftpCredentials.password} />
            </div>
          )}
        </Section>

        {user?.isAdmin && (
          <Section title="Danger Zone" desc="Irreversible actions.">
            <button type="button" onClick={() => setDeleteOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition">
              Delete Server
            </button>
          </Section>
        )}
      </div>

      <Modal open={deleteOpen} title="Delete server?"
        body={`Permanently delete "${server?.name}"? The container will be removed from the node and all data lost.`}
        confirmLabel="Delete" danger
        onConfirm={deleteServer}
        onClose={() => setDeleteOpen(false)} />
      </FadeUp>
    </PanelLayout>
  )
}
