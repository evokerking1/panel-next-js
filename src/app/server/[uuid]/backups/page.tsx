'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'

interface Backup { UUID: string; name: string; size?: number | bigint; createdAt: string; filePath: string }

export default function ServerBackupsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)

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

  function fmtSize(n?: number | bigint) {
    if (!n) return '—'
    const b = Number(n)
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 pt-4">
        <p className="text-base font-medium text-neutral-800 dark:text-white">Backups</p>
      </div>
      <ServerTabs uuid={uuid} />
      <div className="px-4 sm:px-8 mt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-neutral-500">{backups.length} backup{backups.length !== 1 ? 's' : ''}</p>
          <button onClick={createBackup} disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
            {creating
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>}
            Create backup
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
        ) : backups.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 py-12 text-center">
            <p className="text-sm text-neutral-400">No backups yet.</p>
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
                        <button onClick={() => setRestoreTarget(b)} className="text-xs text-blue-500 hover:underline">Restore</button>
                        <button onClick={() => setDeleteTarget(b)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} title="Delete backup?" body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger onConfirm={deleteBackup} onClose={() => setDeleteTarget(null)} />
      <Modal open={!!restoreTarget} title="Restore backup?" body={`Restore "${restoreTarget?.name}"? The server will be stopped and current files overwritten.`}
        confirmLabel="Restore" onConfirm={restoreBackup} onClose={() => setRestoreTarget(null)} />
    </PanelLayout>
  )
}
