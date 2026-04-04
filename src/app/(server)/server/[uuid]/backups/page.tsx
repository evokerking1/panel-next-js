'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/panel/server/ServerHeader'
import ServerTabs from '@/components/panel/server/ServerTabs'
import InstallBanner from '@/components/panel/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import { Loader2, Plus, Archive, Download, RotateCcw, Trash2 } from 'lucide-react'

interface Backup {
  UUID: string
  name: string
  size?: number | bigint
  createdAt: string
  filePath: string
}

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
  Queued: boolean
}

function formatSize(value?: number | bigint) {
  if (!value) return 'Unknown size'
  const bytes = Number(value)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function ServerBackupsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerInfo | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStatus(d.serverStatus?.online ? 'running' : 'stopped')
        }
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
  }, [uuid])

  function loadBackups() {
    setLoading(true)
    fetch(`/api/server/${uuid}/backups`)
      .then(r => r.json())
      .then(d => setBackups(d.backups || []))
      .catch(() => showToast('Failed to load backups.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadBackups()
  }, [uuid])

  async function createBackup() {
    setCreating(true)
    const res = await fetch(`/api/server/${uuid}/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      showToast('Backup created.', 'success')
      loadBackups()
    } else {
      showToast(data.error || 'Backup failed.', 'error')
    }
    setCreating(false)
    setCreateOpen(false)
  }

  async function deleteBackup() {
    if (!deleteTarget) return
    const res = await fetch(`/api/server/${uuid}/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', backupId: deleteTarget.UUID }),
    })
    if (res.ok) {
      showToast('Backup deleted.', 'success')
      loadBackups()
    } else {
      showToast('Failed to delete.', 'error')
    }
    setDeleteTarget(null)
  }

  async function restoreBackup() {
    if (!restoreTarget) return
    const res = await fetch(`/api/server/${uuid}/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', backupId: restoreTarget.UUID }),
    })
    if (res.ok) showToast('Restore started.', 'success')
    else showToast('Restore failed.', 'error')
    setRestoreTarget(null)
  }

  function downloadBackup(backup: Backup) {
    window.location.href = `/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(backup.filePath)}`
  }

  const primaryActionClass = 'flex items-center gap-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100'
  const neutralBtn = 'rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100'
  const greenBtn = 'rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.96] transition-transform duration-100'
  const redBtn = 'rounded-xl bg-red-600 hover:bg-red-500 hover:brightness-110 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.96] transition-transform duration-100'

  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8 lg:pt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {server ? (
              <ServerHeader name={server.name} description={server.description} status={status} />
            ) : (
              <div>
                <h1 className="text-base font-medium text-neutral-800 dark:text-white">Backups</h1>
                <p className="text-xs text-neutral-500 mt-0.5">Manage your server backups</p>
              </div>
            )}
          </div>
          <button onClick={() => setCreateOpen(true)} disabled={creating} className={primaryActionClass}>
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create Backup
          </button>
        </div>
      </div>

      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />

      <div className="panel-page panel-stack">
        {status === 'running' && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-800/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 mb-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Stop the server before restoring backups.</p>
          </div>
        )}

        <div className="panel-card">
          <div className="panel-card-header">
            <p className="text-sm font-medium text-neutral-800 dark:text-white">Server Backups</p>
            <p className="text-xs text-neutral-500 mt-0.5">Manage your server backups.</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map(index => (
                <div key={index} className="rounded-xl bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/5 px-4 py-3">
                  <div className="skeleton h-4 w-40 mb-2" />
                  <div className="skeleton h-3 w-28 mb-3" />
                  <div className="flex gap-2">
                    <div className="skeleton h-9 flex-1" />
                    <div className="skeleton h-9 flex-1" />
                    <div className="skeleton h-9 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : backups.length > 0 ? (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {backups.map((backup, index) => (
                      <tr key={backup.UUID} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">{backup.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">{formatSize(backup.size)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">{new Date(backup.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => downloadBackup(backup)} className={neutralBtn}>
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                            <button onClick={() => setRestoreTarget(backup)} className={greenBtn}>
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                            <button onClick={() => setDeleteTarget(backup)} className={redBtn}>
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-neutral-200 dark:divide-white/5">
                {backups.map((backup, index) => (
                  <div key={backup.UUID} className="animate-fade-in-up px-4 py-3" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{backup.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formatSize(backup.size)} · {new Date(backup.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadBackup(backup)} className="flex-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100">
                        Download
                      </button>
                      <button onClick={() => setRestoreTarget(backup)} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.96] transition-transform duration-100">
                        Restore
                      </button>
                      <button onClick={() => setDeleteTarget(backup)} className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.96] transition-transform duration-100">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center">
              <Archive className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No backups yet</p>
              <p className="text-xs text-neutral-500 mt-1">Create your first backup to get started.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!createOpen}
        title="Create Backup"
        body="Create a new backup using the server's current files. The existing API auto-generates the backup name."
        confirmLabel={creating ? 'Creating...' : 'Create'}
        onConfirm={createBackup}
        onClose={() => setCreateOpen(false)}
      />

      <Modal
        open={!!deleteTarget}
        title="Delete backup?"
        body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteBackup}
        onClose={() => setDeleteTarget(null)}
      />

      <Modal
        open={!!restoreTarget}
        title="Restore backup?"
        body={`Restore "${restoreTarget?.name}"? This will replace current server files.`}
        confirmLabel="Restore"
        onConfirm={restoreBackup}
        onClose={() => setRestoreTarget(null)}
      />
    </PanelLayout>
  )
}
