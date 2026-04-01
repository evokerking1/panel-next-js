'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'

interface FileEntry { name: string; type: 'file' | 'directory'; size?: number; modified?: string }

function FileIcon({ type }: { type: string }) {
  if (type === 'directory') return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500 shrink-0">
      <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 12h-15a4.483 4.483 0 0 0-3 1.146Z" />
    </svg>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-neutral-400 shrink-0">
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
    </svg>
  )
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ServerFilesPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editFile, setEditFile] = useState<{ path: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  function loadFiles(p: string) {
    setLoading(true)
    fetch(`/api/server/${uuid}/files?action=list&path=${encodeURIComponent(p)}`)
      .then(r => r.json())
      .then(d => setFiles(d.files || []))
      .catch(() => showToast('Failed to load files.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadFiles(path) }, [uuid, path])

  function navigate(name: string, type: string) {
    if (type === 'directory') {
      setPath(p => p.endsWith('/') ? p + name : p + '/' + name)
    } else {
      const filePath = (path.endsWith('/') ? path : path + '/') + name
      setLoading(true)
      fetch(`/api/server/${uuid}/files?action=read&filePath=${encodeURIComponent(filePath)}`)
        .then(r => r.json())
        .then(d => setEditFile({ path: filePath, content: d.content || '' }))
        .catch(() => showToast('Failed to open file.', 'error'))
        .finally(() => setLoading(false))
    }
  }

  function goUp() {
    const parts = path.split('/').filter(Boolean)
    parts.pop()
    setPath('/' + parts.join('/'))
  }

  async function saveFile() {
    if (!editFile) return
    setSaving(true)
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path: editFile.path, content: editFile.content }),
    })
    if (res.ok) showToast('File saved.', 'success')
    else showToast('Failed to save file.', 'error')
    setSaving(false)
  }

  async function deleteFile() {
    if (!deleteTarget) return
    const filePath = (path.endsWith('/') ? path : path + '/') + deleteTarget.name
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', path: filePath }),
    })
    if (res.ok) { showToast('Deleted.', 'success'); loadFiles(path) }
    else showToast('Failed to delete.', 'error')
    setDeleteTarget(null)
  }

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const folderPath = (path.endsWith('/') ? path : path + '/') + name
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mkdir', path: folderPath }),
    })
    if (res.ok) { showToast('Folder created.', 'success'); loadFiles(path); setNewFolderOpen(false); setNewFolderName('') }
    else showToast('Failed to create folder.', 'error')
  }

  const breadcrumbs = ['/', ...path.split('/').filter(Boolean)]

  return (
    <PanelLayout>
      <FadeUp>
      <div className="px-4 sm:px-8 pt-4">
        <p className="text-base font-medium text-neutral-800 dark:text-white">Files</p>
      </div>
      </FadeUp>
      <ServerTabs uuid={uuid} />
      <FadeUp delay={0.06}>
      <div className="px-4 sm:px-8 mt-4 pb-8">
        {editFile ? (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-neutral-800/20">
              <p className="text-sm font-mono text-neutral-600 dark:text-neutral-400">{editFile.path}</p>
              <div className="flex gap-2">
                <button onClick={() => setEditFile(null)} className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Back</button>
                <button onClick={saveFile} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea value={editFile.content} onChange={e => setEditFile(f => f ? { ...f, content: e.target.value } : f)}
              className="w-full h-[600px] p-4 font-mono text-sm bg-neutral-900 text-neutral-100 resize-none outline-none"
              spellCheck={false} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                {breadcrumbs.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-neutral-300 dark:text-neutral-600">/</span>}
                    <button onClick={() => {
                      if (i === 0) setPath('/')
                      else setPath('/' + breadcrumbs.slice(1, i + 1).join('/'))
                    }} className="hover:text-neutral-800 dark:hover:text-neutral-200 transition">{part}</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                {path !== '/' && (
                  <button onClick={goUp} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Up</button>
                )}
                <button onClick={() => setNewFolderOpen(true)} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">New folder</button>
                <button onClick={() => loadFiles(path)} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Refresh</button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-400">This directory is empty.</div>
              ) : (
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                    <tr>{['Name', 'Size', 'Modified', ''].map(h => (
                      <th key={h} className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                    {files.map(f => (
                      <tr key={f.name} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pl-4 pr-3">
                          <button onClick={() => navigate(f.name, f.type)} className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition text-left">
                            <FileIcon type={f.type} />
                            {f.name}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-neutral-500">{formatSize(f.size)}</td>
                        <td className="px-3 py-2.5 text-xs text-neutral-500">{f.modified ? new Date(f.modified).toLocaleDateString() : ''}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => setDeleteTarget(f)} className="text-xs text-red-500 hover:underline opacity-0 group-hover:opacity-100 hover:opacity-100 transition">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-sm p-5">
            <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">New folder</p>
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setNewFolderOpen(false) }}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400 dark:focus:border-white/25 mb-4 transition"
              placeholder="folder-name" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNewFolderOpen(false)} className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-50 transition">Cancel</button>
              <button onClick={createFolder} className="px-3 py-1.5 text-sm rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">Create</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} title="Delete file?"
        body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger onConfirm={deleteFile} onClose={() => setDeleteTarget(null)} />
      </FadeUp>
    </PanelLayout>
  )
}
