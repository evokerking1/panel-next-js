'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'
import { Loader2, Plus, Archive } from 'lucide-react'

interface Backup { UUID: string; name: string; size?: number | bigint; createdAt: string; filePath: string }

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
}

export default function ServerBackupsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
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
      })
      .catch(() => {})
  }, [uuid])

  function load() {
    fetch(`/api/server/${uuid}/backups`).then(r => r.json()).then(d => setBackups(d.backups || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [uuid])

  async function createBackup() {
    setCreating(true)
    const res = await fetch(`/api/server/${uuid}/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    })
    const d = await res.json()
    if (res.ok) { showToast('Backup created.', 'success'); load() }
    else showToast(d.error || 'Backup failed.', 'error')
    setCreating(false)
  }

  async function deleteBackup() {
    if (!deleteTarget) return
    const res = await fetch(`/api/server/${uuid}/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', backupId: deleteTarget.UUID }),
    })
    if (res.ok) { showToast('Backup deleted.', 'success'); load() }
    else showToast('Failed to delete.', 'error')
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

  function downloadBackup(b: Backup) {
    window.location.href = `/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(b.filePath)}`
  }

  function fmtSize(n?: number | bigint) {
    if (!n) return '—'
    const b = Number(n)
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  const btnClass = 'inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md transition'

  return (
    <PanelLayout>
      <FadeUp>
      <div className="px-4 sm:px-8 pt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {server ? (
              <ServerHeader name={server.name} description={server.description} status={status} />
            ) : (
              <p className="text-base font-medium text-neutral-800 dark:text-white">Backups</p>
            )}
          </div>
          <button onClick={createBackup} disabled={creating}
            className="shrink-0 flex items-center gap-1.5 border border-neutral-800/20 rounded-xl bg-white hover:bg-neutral-200 dark:hover:bg-neutral-300 text-neutral-800 px-3 py-2 text-sm font-medium shadow-lg transition disabled:opacity-60">
            {creating
              ? <Loader2 className="animate-spin h-4 w-4" />
              : <Plus className="h-4 w-4" />}
            Create backup
          </button>
        </div>
      </div>
      </FadeUp>

      <ServerTabs uuid={uuid} />
      {server && <InstallBanner uuid={uuid} installing={server.Installing} />}

      <FadeUp delay={0.06}>
      <div className="px-4 sm:px-8 mt-4 pb-8">
        <p className="text-sm text-neutral-500 mb-4">{backups.length} backup{backups.length !== 1 ? 's' : ''}</p>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-5 w-5 text-neutral-400" /></div>
        ) : backups.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 py-12 text-center">
            <Archive className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white">No backups</p>
            <p className="mt-1 text-sm text-neutral-500">Get started by creating your first backup.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
              <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                <tr>{['Name', 'Size', 'Created', 'Actions'].map(h => (
                  <th key={h} className="py-3 pl-6 pr-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                {backups.map(b => (
                  <tr key={b.UUID} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-6 pr-3">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white">{b.name}</p>
                      <p className="text-xs font-mono text-neutral-400">{b.UUID.split('-')[0]}</p>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{fmtSize(b.size as number)}</td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex gap-2">
                        <button onClick={() => downloadBackup(b)} className={`${btnClass} text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40`}>Download</button>
                        <button onClick={() => setRestoreTarget(b)} className={`${btnClass} text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40`}>Restore</button>
                        <button onClick={() => setDeleteTarget(b)} className={`${btnClass} text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40`}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </FadeUp>

      <Modal open={!!deleteTarget} title="Delete backup?" body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger onConfirm={deleteBackup} onClose={() => setDeleteTarget(null)} />
      <Modal open={!!restoreTarget} title="Restore backup?" body={`Restore "${restoreTarget?.name}"? The server will be stopped and current files overwritten.`}
        confirmLabel="Restore" onConfirm={restoreBackup} onClose={() => setRestoreTarget(null)} />
    </PanelLayout>
  )
}
