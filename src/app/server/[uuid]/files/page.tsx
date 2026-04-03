'use client'

import { useState, useEffect, useRef, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Modal from '@/components/ui/Modal'
import { Folder, File, Loader2, Download, Plus, Upload, FolderPlus, Pencil } from 'lucide-react'

interface FileEntry { name: string; type: 'file' | 'directory'; size?: number; modified?: string }

interface ServerInfo { UUID: string; name: string; Installing: boolean }

function FileIcon({ type }: { type: string }) {
  if (type === 'directory') return <Folder className="h-4 w-4 text-amber-500 shrink-0" />
  return <File className="h-4 w-4 text-neutral-400 shrink-0" />
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const headerBtnClass = 'border border-neutral-800/20 rounded-xl bg-white hover:bg-neutral-200 dark:hover:bg-neutral-300 text-neutral-800 px-3 py-2 text-sm font-medium shadow-lg transition flex items-center gap-1.5'

function NameModal({ open, title, placeholder, value, onChange, onConfirm, onClose }: {
  open: boolean; title: string; placeholder: string; value: string
  onChange: (v: string) => void; onConfirm: () => void; onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-[14px] w-full max-w-[380px] p-[22px]">
        <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">{title}</p>
        <input autoFocus type="text" value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onClose() }}
          placeholder={placeholder}
          className="w-full border border-neutral-200 dark:border-white/[0.10] rounded-[9px] bg-neutral-50 dark:bg-white/[0.04] px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 mb-4 transition" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-neutral-500 border border-neutral-200 dark:border-white/[0.10] hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-[9px] text-[13px] font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default function ServerFilesPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()
  const [server, setServer] = useState<ServerInfo | null>(null)
  const [path, setPath] = useState('/')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editFile, setEditFile] = useState<{ path: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileOpen, setNewFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameName, setRenameName] = useState('')
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => { if (d.server) setServer(d.server) })
      .catch(() => {})
  }, [uuid])

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
    if (res.ok) { showToast('Folder created.', 'success'); loadFiles(path) }
    else showToast('Failed to create folder.', 'error')
    setNewFolderOpen(false)
    setNewFolderName('')
  }

  async function createFile() {
    const name = newFileName.trim()
    if (!name) return
    const filePath = (path.endsWith('/') ? path : path + '/') + name
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path: filePath, content: '' }),
    })
    if (res.ok) { showToast('File created.', 'success'); loadFiles(path) }
    else showToast('Failed to create file.', 'error')
    setNewFileOpen(false)
    setNewFileName('')
  }

  async function renameFile() {
    if (!renameTarget) return
    const name = renameName.trim()
    if (!name) return
    const fullPath = (path.endsWith('/') ? path : path + '/') + renameTarget.name
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: fullPath, newName: name }),
    })
    if (res.ok) { showToast('Renamed.', 'success'); loadFiles(path) }
    else showToast('Failed to rename.', 'error')
    setRenameTarget(null)
    setRenameName('')
  }

  function handleUpload() {
    showToast('Upload not yet available.', 'error')
    if (uploadRef.current) uploadRef.current.value = ''
  }

  function downloadFile(name: string) {
    const filePath = (path.endsWith('/') ? path : path + '/') + name
    window.location.href = `/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(filePath)}`
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
      {server && <InstallBanner uuid={uuid} installing={server.Installing} />}
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
              <div className="flex gap-2 flex-wrap">
                {path !== '/' && (
                  <button onClick={goUp} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Up</button>
                )}
                <button onClick={() => loadFiles(path)} className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">Refresh</button>
                <button onClick={() => setNewFileOpen(true)} className={headerBtnClass}>
                  <Plus className="h-4 w-4" />
                  New File
                </button>
                <button onClick={() => uploadRef.current?.click()} className={headerBtnClass}>
                  <Upload className="h-4 w-4" />
                  Upload File
                </button>
                <input ref={uploadRef} type="file" multiple className="hidden" onChange={handleUpload} />
                <button onClick={() => setNewFolderOpen(true)} className={headerBtnClass}>
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
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
                      <tr key={f.name} className="group hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pl-4 pr-3">
                          <button onClick={() => navigate(f.name, f.type)} className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition text-left">
                            <FileIcon type={f.type} />
                            {f.name}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-neutral-500">{formatSize(f.size)}</td>
                        <td className="px-3 py-2.5 text-xs text-neutral-500">{f.modified ? new Date(f.modified).toLocaleDateString() : ''}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            {f.type === 'file' && (
                              <button onClick={() => downloadFile(f.name)} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => { setRenameTarget(f); setRenameName(f.name) }} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition" title="Rename">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(f)} className="text-xs text-red-500 hover:underline transition">Delete</button>
                          </div>
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
      </FadeUp>

      <Modal open={!!deleteTarget} title="Delete file?"
        body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger onConfirm={deleteFile} onClose={() => setDeleteTarget(null)} />

      <NameModal open={newFolderOpen} title="New Folder" placeholder="folder-name"
        value={newFolderName} onChange={setNewFolderName} onConfirm={createFolder}
        onClose={() => { setNewFolderOpen(false); setNewFolderName('') }} />

      <NameModal open={newFileOpen} title="New File" placeholder="filename.txt"
        value={newFileName} onChange={setNewFileName} onConfirm={createFile}
        onClose={() => { setNewFileOpen(false); setNewFileName('') }} />

      <NameModal open={!!renameTarget} title={`Rename "${renameTarget?.name}"`} placeholder="new-name"
        value={renameName} onChange={setRenameName} onConfirm={renameFile}
        onClose={() => { setRenameTarget(null); setRenameName('') }} />
    </PanelLayout>
  )
}
