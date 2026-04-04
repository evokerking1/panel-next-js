'use client'

import { useState, useEffect, useRef, use, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import {
  Folder,
  File,
  Upload,
  FolderPlus,
  Pencil,
  FileText,
  Image as ImageIcon,
  Terminal,
  Eye,
  Trash2,
  ChevronRight,
  X,
  Download,
} from 'lucide-react'

interface FileEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

interface ServerInfo {
  UUID: string
  name: string
  Installing: boolean
  Queued: boolean
}

type FileCategory = 'Configuration Files' | 'Documents' | 'Folder' | 'Images' | 'No Category'

function getFileCategory(file: FileEntry): FileCategory {
  if (file.type === 'directory') return 'Folder'

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (['yml', 'yaml', 'json', 'toml', 'env', 'ini', 'cfg', 'conf', 'properties', 'sh', 'bat', 'cmd', 'js', 'ts', 'mjs', 'cjs'].includes(ext)) {
    return 'Configuration Files'
  }
  if (['txt', 'md', 'log', 'pdf', 'doc', 'docx', 'rtf'].includes(ext)) {
    return 'Documents'
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'].includes(ext)) {
    return 'Images'
  }
  return 'No Category'
}

function isImageFile(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff'].includes(ext)
}

function FileIcon({ file }: { file: FileEntry }) {
  const category = getFileCategory(file)
  if (category === 'Folder') return <Folder className="w-6 h-6 text-amber-500 shrink-0" />
  if (category === 'Configuration Files') return <Terminal className="w-6 h-6 text-neutral-500 shrink-0" />
  if (category === 'Documents') return <FileText className="w-6 h-6 text-neutral-500 shrink-0" />
  if (category === 'Images') return <ImageIcon className="w-6 h-6 text-neutral-500 shrink-0" />
  return <File className="w-6 h-6 text-neutral-500 shrink-0" />
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatModified(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

const actionBtnClass = 'rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5'
const secondaryBtnClass = 'rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5'
const blueBtnClass = 'rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5'
const redBtnClass = 'rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 hover:brightness-110 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5'

function NameModal({
  open,
  title,
  placeholder,
  value,
  onChange,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="animate-modal-in bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-[14px] w-full max-w-[380px] p-[22px]">
        <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">{title}</p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onClose() }}
          placeholder={placeholder}
          className="w-full border border-neutral-200 dark:border-white/[0.10] rounded-[9px] bg-neutral-50 dark:bg-white/[0.04] px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 mb-4 transition"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-neutral-500 border border-neutral-200 dark:border-white/[0.10] hover:bg-neutral-50 dark:hover:bg-white/5 transition active:scale-[0.96] transition-transform duration-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-[9px] text-[13px] font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition active:scale-[0.96] transition-transform duration-100">Confirm</button>
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
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
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
  const [previewTarget, setPreviewTarget] = useState<{ name: string; url: string; size: string } | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) setServer(d.server)
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
  }, [uuid])

  function loadFiles(nextPath: string) {
    setLoading(true)
    fetch(`/api/server/${uuid}/files?action=list&path=${encodeURIComponent(nextPath)}`)
      .then(r => r.json())
      .then(d => setFiles(d.files || []))
      .catch(() => showToast('Failed to load files.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFiles(path)
  }, [uuid, path])

  function fullPath(name: string) {
    return (path.endsWith('/') ? path : `${path}/`) + name
  }

  function openTextEditor(name: string) {
    const filePath = fullPath(name)
    setLoading(true)
    fetch(`/api/server/${uuid}/files?action=read&filePath=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => setEditFile({ path: filePath, content: d.content || '' }))
      .catch(() => showToast('Failed to open file.', 'error'))
      .finally(() => setLoading(false))
  }

  async function openImagePreview(name: string) {
    try {
      const response = await fetch(`/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(fullPath(name))}`)
      if (!response.ok) throw new Error()
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      setPreviewTarget(current => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return { name, url: objectUrl, size: formatSize(blob.size) }
      })
    } catch {
      showToast('Failed to load preview.', 'error')
    }
  }

  useEffect(() => {
    return () => {
      if (previewTarget?.url) URL.revokeObjectURL(previewTarget.url)
    }
  }, [previewTarget])

  function navigate(file: FileEntry) {
    if (file.type === 'directory') {
      setPath(fullPath(file.name))
      return
    }
    if (isImageFile(file.name)) {
      void openImagePreview(file.name)
      return
    }
    openTextEditor(file.name)
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
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', path: fullPath(deleteTarget.name) }),
    })
    if (res.ok) {
      showToast('Deleted.', 'success')
      loadFiles(path)
    } else {
      showToast('Failed to delete.', 'error')
    }
    setDeleteTarget(null)
  }

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mkdir', path: fullPath(name) }),
    })
    if (res.ok) {
      showToast('Folder created.', 'success')
      loadFiles(path)
    } else {
      showToast('Failed to create folder.', 'error')
    }
    setNewFolderOpen(false)
    setNewFolderName('')
  }

  async function createFile() {
    const name = newFileName.trim()
    if (!name) return
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path: fullPath(name), content: '' }),
    })
    if (res.ok) {
      showToast('File created.', 'success')
      loadFiles(path)
    } else {
      showToast('Failed to create file.', 'error')
    }
    setNewFileOpen(false)
    setNewFileName('')
  }

  async function renameFile() {
    if (!renameTarget) return
    const name = renameName.trim()
    if (!name) return
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: fullPath(renameTarget.name), newName: name }),
    })
    if (res.ok) {
      showToast('Renamed.', 'success')
      loadFiles(path)
    } else {
      showToast('Failed to rename.', 'error')
    }
    setRenameTarget(null)
    setRenameName('')
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('uploadPath', path.endsWith('/') ? path : `${path}/`)
      const res = await fetch(`/api/server/${uuid}/files`, { method: 'POST', body: fd })
      if (res.ok) showToast(`${file.name} uploaded.`, 'success')
      else showToast(`Failed to upload ${file.name}.`, 'error')
    }

    if (uploadRef.current) uploadRef.current.value = ''
    loadFiles(path)
  }

  function downloadFile(name: string) {
    window.location.href = `/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(fullPath(name))}`
  }

  const breadcrumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    return [{ label: '/home/container', value: '/' }, ...parts.map((part, index) => ({
      label: part,
      value: `/${parts.slice(0, index + 1).join('/')}`,
    }))]
  }, [path])

  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8 lg:pt-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Files</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Browse and manage your server files</p>
          </div>
        </div>
      </div>

      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />

      <div className="animate-fade-in-up px-4 pb-8 lg:px-8 lg:mt-4">
        {editFile ? (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-neutral-800/20">
              <p className="text-sm font-mono text-neutral-600 dark:text-neutral-400">{editFile.path}</p>
              <div className="flex gap-2">
                <button onClick={() => setEditFile(null)} className="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition active:scale-[0.96] transition-transform duration-100">Back</button>
                <button onClick={saveFile} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition active:scale-[0.96] transition-transform duration-100">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea
              value={editFile.content}
              onChange={e => setEditFile(current => current ? { ...current, content: e.target.value } : current)}
              className="w-full h-[600px] p-4 font-mono text-sm bg-neutral-900 text-neutral-100 resize-none outline-none"
              spellCheck={false}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="px-3 py-2.5 flex items-center overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700/40 bg-white dark:bg-neutral-900/60 flex-1 min-w-0">
                <nav className="flex items-center gap-0 text-xs min-w-0 overflow-hidden">
                  {breadcrumbs.map((part, index) => (
                    <span key={part.value} className="flex items-center min-w-0">
                      {index > 0 && <ChevronRight className="w-3 h-3 text-neutral-400 dark:text-neutral-600 shrink-0 mx-0.5" />}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="text-neutral-700 dark:text-neutral-200 font-medium truncate">{part.label}</span>
                      ) : (
                        <button onClick={() => setPath(part.value)} className={`transition truncate ${index === 0 ? 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                          {part.label}
                        </button>
                      )}
                    </span>
                  ))}
                </nav>
              </div>

              <div className="flex gap-2 flex-wrap">
                {path !== '/' && <button onClick={goUp} className={secondaryBtnClass}>Up</button>}
                <button onClick={() => loadFiles(path)} className={secondaryBtnClass}>Refresh</button>
                <button onClick={() => setNewFileOpen(true)} className={actionBtnClass}>
                  <FileText className="w-3.5 h-3.5" />
                  Create file
                </button>
                <button onClick={() => uploadRef.current?.click()} className={actionBtnClass}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                <input ref={uploadRef} type="file" multiple className="hidden" onChange={handleUpload} />
                <button onClick={() => setNewFolderOpen(true)} className={actionBtnClass}>
                  <FolderPlus className="w-3.5 h-3.5" />
                  Create folder
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2, 3].map(index => (
                    <div key={index} className="rounded-xl bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3">
                      <div className="skeleton h-4 w-40 mb-2" />
                      <div className="skeleton h-3 w-24 mb-3" />
                      <div className="flex gap-2">
                        <div className="skeleton h-8 w-16" />
                        <div className="skeleton h-8 w-16" />
                        <div className="skeleton h-8 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-400">This directory is empty.</div>
              ) : (
                <>
                  <div className="hidden lg:block">
                    <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                        <tr>{['Name', 'Size', 'Modified', 'Actions'].map(label => (
                          <th key={label} className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-neutral-500">{label}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                        {files.map((file, index) => (
                          <tr key={file.name} className="group hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                            <td className="py-3 pl-4 pr-3">
                              <button onClick={() => navigate(file)} className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 dark:hover:text-white transition-colors text-left">
                                <FileIcon file={file} />
                                <span className="truncate">{file.name}</span>
                              </button>
                            </td>
                            <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatSize(file.size)}</td>
                            <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatModified(file.modified)}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                {file.type === 'file' && !isImageFile(file.name) && (
                                  <button onClick={() => openTextEditor(file.name)} className={blueBtnClass}>
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                )}
                                {file.type === 'file' && isImageFile(file.name) && (
                                  <button onClick={() => void openImagePreview(file.name)} className={secondaryBtnClass}>
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview
                                  </button>
                                )}
                                <button onClick={() => { setRenameTarget(file); setRenameName(file.name) }} className={secondaryBtnClass}>
                                  <Pencil className="w-3.5 h-3.5" />
                                  Rename
                                </button>
                                {file.type === 'file' && (
                                  <button onClick={() => downloadFile(file.name)} className={secondaryBtnClass}>
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </button>
                                )}
                                <button onClick={() => setDeleteTarget(file)} className={redBtnClass}>
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

                  <div className="lg:hidden space-y-3 p-3">
                    {files.map((file, index) => (
                      <div key={file.name} className="animate-fade-in-up rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                        <button onClick={() => navigate(file)} className="w-full flex items-start gap-3 text-left active:scale-[0.98] transition-transform duration-100">
                          <FileIcon file={file} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                              <span>{formatSize(file.size) || (file.type === 'directory' ? 'Folder' : 'File')}</span>
                              {file.modified && <span>{formatModified(file.modified)}</span>}
                            </div>
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {file.type === 'file' && !isImageFile(file.name) && (
                            <button onClick={() => openTextEditor(file.name)} className={blueBtnClass}>
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          )}
                          {file.type === 'file' && isImageFile(file.name) && (
                            <button onClick={() => void openImagePreview(file.name)} className={secondaryBtnClass}>
                              <Eye className="w-3.5 h-3.5" />
                              Preview
                            </button>
                          )}
                          <button onClick={() => { setRenameTarget(file); setRenameName(file.name) }} className={secondaryBtnClass}>
                            <Pencil className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          {file.type === 'file' && (
                            <button onClick={() => downloadFile(file.name)} className={secondaryBtnClass}>
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(file)} className={redBtnClass}>
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        title="Delete file?"
        body={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteFile}
        onClose={() => setDeleteTarget(null)}
      />

      <NameModal
        open={newFolderOpen}
        title="New Folder"
        placeholder="folder-name"
        value={newFolderName}
        onChange={setNewFolderName}
        onConfirm={createFolder}
        onClose={() => { setNewFolderOpen(false); setNewFolderName('') }}
      />

      <NameModal
        open={newFileOpen}
        title="New File"
        placeholder="filename.txt"
        value={newFileName}
        onChange={setNewFileName}
        onConfirm={createFile}
        onClose={() => { setNewFileOpen(false); setNewFileName('') }}
      />

      <NameModal
        open={!!renameTarget}
        title={`Rename "${renameTarget?.name}"`}
        placeholder="new-name"
        value={renameName}
        onChange={setRenameName}
        onConfirm={renameFile}
        onClose={() => { setRenameTarget(null); setRenameName('') }}
      />

      {previewTarget && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={e => {
          if (e.target === e.currentTarget) {
            URL.revokeObjectURL(previewTarget.url)
            setPreviewTarget(null)
          }
        }}>
          <div className="animate-modal-in w-full max-w-4xl rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-white/10">
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-white">{previewTarget.name}</p>
                <p className="text-xs text-neutral-500">{previewTarget.size}</p>
              </div>
              <button onClick={() => {
                URL.revokeObjectURL(previewTarget.url)
                setPreviewTarget(null)
              }} className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition active:scale-90 transition-transform duration-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-neutral-100 dark:bg-neutral-950 p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={previewTarget.url} alt={previewTarget.name} className="max-w-full max-h-[68vh] rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
