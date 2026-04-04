'use client'

import { useState, useEffect, useRef, use, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerTabs from '@/components/panel/server/ServerTabs'
import InstallBanner from '@/components/panel/server/InstallBanner'
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
  Save,
  ArrowLeft,
  MoreHorizontal,
  Copy,
  CheckSquare,
  Loader2,
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

function normalizePath(value: string) {
  const cleaned = value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/')
  return cleaned
}

function joinPath(base: string, name: string) {
  const normalizedBase = normalizePath(base)
  const normalizedName = normalizePath(name)
  return normalizedBase ? `${normalizedBase}/${normalizedName}` : normalizedName
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
const redBtnClass = 'rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 hover:brightness-110 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5'

function EditorPane({
  editFile,
  saving,
  dirty,
  loading,
  fullScreen,
  onBack,
  onSave,
  onChange,
}: {
  editFile: { path: string; content: string }
  saving: boolean
  dirty: boolean
  loading: boolean
  fullScreen?: boolean
  onBack: () => void
  onSave: () => void
  onChange: (value: string) => void
}) {
  const lineCount = editFile.content.length ? editFile.content.split('\n').length : 1
  const charCount = editFile.content.length

  return (
    <div className="animate-modal-in rounded-[1.2rem] border border-neutral-200 dark:border-white/5 overflow-hidden bg-white shadow-2xl dark:bg-neutral-900/90">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-white/5 bg-neutral-50/95 px-4 py-3 backdrop-blur dark:bg-neutral-900/95">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-neutral-600 dark:text-neutral-300">{editFile.path}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
            <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
            <span>{charCount} chars</span>
            <span className={loading ? 'text-blue-600 dark:text-blue-400' : dirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {loading ? 'Loading file' : dirty ? 'Unsaved changes' : 'Saved'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Close
          </button>
          <button onClick={onSave} disabled={saving || loading} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex min-h-[55vh] items-center justify-center bg-[#141414] px-6 text-center lg:min-h-[70vh]" style={fullScreen ? { minHeight: 'calc(100dvh - 7rem)' } : undefined}>
          <div className="animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-200" />
            </div>
            <p className="text-sm font-medium text-white">Opening file…</p>
          </div>
        </div>
      ) : (
        <textarea
          value={editFile.content}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
              e.preventDefault()
              onSave()
              return
            }

            if (e.key === 'Tab') {
              e.preventDefault()
              const target = e.currentTarget
              const start = target.selectionStart
              const end = target.selectionEnd
              const nextValue = `${editFile.content.slice(0, start)}  ${editFile.content.slice(end)}`
              onChange(nextValue)
              requestAnimationFrame(() => {
                target.selectionStart = start + 2
                target.selectionEnd = start + 2
              })
            }
          }}
          className="min-h-[55vh] w-full resize-none bg-[#141414] p-4 font-mono text-[13px] leading-6 text-neutral-100 outline-none lg:min-h-[70vh]"
          style={fullScreen ? { minHeight: 'calc(100dvh - 7rem)' } : undefined}
          spellCheck={false}
        />
      )}
    </div>
  )
}

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
  const [path, setPath] = useState('')
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editFile, setEditFile] = useState<{ path: string; content: string } | null>(null)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorClosing, setEditorClosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileOpen, setNewFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameName, setRenameName] = useState('')
  const [previewTarget, setPreviewTarget] = useState<{ name: string; url: string; size: string } | null>(null)
  const [savedContent, setSavedContent] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [menuTarget, setMenuTarget] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) return
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setMenuTarget(null)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuTarget(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  function loadFiles(nextPath: string) {
    setLoading(true)
    const normalized = normalizePath(nextPath)
    const query = `&path=${encodeURIComponent(normalized || '/')}`
    fetch(`/api/server/${uuid}/files?action=list${query}`)
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d.files)) {
          throw new Error(d.error || 'Failed to load files.')
        }
        setFiles(d.files || [])
        setSelectedFiles([])
        setMenuTarget(null)
      })
      .catch(() => showToast('Failed to load files.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFiles(path)
  }, [uuid, path])

  function fullPath(name: string) {
    return joinPath(path, name)
  }

  async function movePath(sourcePath: string, targetPath: string) {
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', path: sourcePath, newName: normalizePath(targetPath) }),
    })
    return res
  }

  async function createEmptyFile(filePath: string) {
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path: normalizePath(filePath), content: '' }),
    })
    return res
  }

  function openTextEditor(name: string) {
    const filePath = fullPath(name)
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setEditorClosing(false)
    setEditorLoading(true)
    setEditFile(current => current?.path === filePath ? current : { path: filePath, content: '' })
    fetch(`/api/server/${uuid}/files?action=read&filePath=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => {
        if (!('content' in d)) {
          throw new Error(d.error || 'Failed to open file.')
        }
        const content = typeof d.content === 'string' ? d.content : String(d.content ?? '')
        setEditFile({ path: filePath, content })
        setSavedContent(content)
      })
      .catch(() => showToast('Failed to open file.', 'error'))
      .finally(() => setEditorLoading(false))
  }

  function closeEditor() {
    if (!editFile || editorClosing) return
    setEditorClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setEditFile(null)
      setSavedContent('')
      setEditorLoading(false)
      setEditorClosing(false)
      closeTimerRef.current = null
    }, 180)
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
    const parts = normalizePath(path).split('/').filter(Boolean)
    parts.pop()
    setPath(parts.join('/'))
  }

  async function saveFile() {
    if (!editFile) return
    setSaving(true)
    const res = await fetch(`/api/server/${uuid}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'write', path: editFile.path, content: editFile.content }),
    })
    if (res.ok) {
      setSavedContent(editFile.content)
      showToast('File saved.', 'success')
    }
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

  async function deleteSelected() {
    if (selectedFiles.length === 0) return

    let failed = 0
    for (const filePath of selectedFiles) {
      const res = await fetch(`/api/server/${uuid}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path: filePath }),
      })
      if (!res.ok) failed += 1
    }

    if (failed === 0) showToast('Selected files deleted.', 'success')
    else showToast(`${failed} item(s) failed to delete.`, 'error')

    loadFiles(path)
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
    const name = normalizePath(newFileName.trim())
    if (!name) return

    const finalPath = fullPath(name)
    const res = name.includes('/')
      ? await (async () => {
          const tempName = `__tmp_${Date.now()}`
          const tempPath = fullPath(tempName)
          const created = await createEmptyFile(tempPath)
          if (!created.ok) return created
          return movePath(tempPath, finalPath)
        })()
      : await createEmptyFile(finalPath)

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
    const name = normalizePath(renameName.trim())
    if (!name) return
    const sourcePath = fullPath(renameTarget.name)
    const destinationPath = path ? joinPath(path, name) : name
    const res = await movePath(sourcePath, destinationPath)
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
      fd.append('uploadPath', path ? `${path}/` : '')
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
    const parts = normalizePath(path).split('/').filter(Boolean)
    return [{ label: '/home/container', value: '' }, ...parts.map((part, index) => ({
      label: part,
      value: parts.slice(0, index + 1).join('/'),
    }))]
  }, [path])

  const isDirty = !!editFile && editFile.content !== savedContent
  const allSelected = files.length > 0 && selectedFiles.length === files.length

  function toggleSelected(file: FileEntry) {
    const filePath = fullPath(file.name)
    setSelectedFiles((current) => current.includes(filePath)
      ? current.filter((item) => item !== filePath)
      : [...current, filePath])
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedFiles([])
      return
    }
    setSelectedFiles(files.map((file) => fullPath(file.name)))
  }

  async function copyPath(filePath: string) {
    try {
      await navigator.clipboard.writeText(filePath)
      showToast('Path copied.', 'success')
    } catch {
      showToast('Failed to copy path.', 'error')
    }
  }

  function menuPositionClass(index: number) {
    return index >= files.length - 2 ? 'bottom-12' : 'top-12'
  }

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
        <div className="grid gap-4">
          <div>
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
                {path && <button onClick={goUp} className={secondaryBtnClass}>Up</button>}
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

            <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-visible">
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
                        <tr>
                          <th className="py-2.5 pl-4 pr-3 text-left w-10">
                            <button onClick={toggleSelectAll} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition">
                              <CheckSquare className={`w-4 h-4 ${allSelected ? 'text-neutral-700 dark:text-white' : ''}`} />
                            </button>
                          </th>
                          {['Name', 'Size', 'Modified', 'Actions'].map(label => (
                          <th key={label} className="py-2.5 pl-4 pr-3 text-left text-xs font-medium text-neutral-500">{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                        {files.map((file, index) => (
                          <tr key={file.name} className="group hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                            <td className="py-3 pl-4 pr-3 align-top">
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(fullPath(file.name))}
                                onChange={() => toggleSelected(file)}
                                className="mt-1 h-4 w-4 rounded border-neutral-300 bg-white text-neutral-800 dark:border-white/10 dark:bg-white/5"
                              />
                            </td>
                            <td className="py-3 pl-4 pr-3">
                              <button onClick={() => navigate(file)} className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 dark:hover:text-white transition-colors text-left">
                                <FileIcon file={file} />
                                <span className="truncate">{file.name}</span>
                              </button>
                            </td>
                            <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatSize(file.size)}</td>
                            <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatModified(file.modified)}</td>
                            <td className="px-3 py-3 relative">
                              <button
                                onClick={() => setMenuTarget((current) => current === file.name ? null : file.name)}
                                className="rounded-lg border border-neutral-200 dark:border-white/10 p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {menuTarget === file.name && (
                                <div ref={menuRef} className={`absolute right-3 ${menuPositionClass(index)} z-[400] w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900`}>
                                  {file.type === 'file' && !isImageFile(file.name) && (
                                    <button onClick={() => { openTextEditor(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit
                                    </button>
                                  )}
                                  {file.type === 'file' && isImageFile(file.name) && (
                                    <button onClick={() => { void openImagePreview(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                      <Eye className="w-3.5 h-3.5" />
                                      Preview
                                    </button>
                                  )}
                                  <button onClick={() => { void copyPath(fullPath(file.name)); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy path
                                  </button>
                                  <button onClick={() => { setRenameTarget(file); setRenameName(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                    <Pencil className="w-3.5 h-3.5" />
                                    Rename
                                  </button>
                                  {file.type === 'file' && (
                                    <button onClick={() => { downloadFile(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                      <Download className="w-3.5 h-3.5" />
                                      Download
                                    </button>
                                  )}
                                  <button onClick={() => { setDeleteTarget(file); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden space-y-3 p-3">
                    {files.map((file, index) => (
                      <div key={file.name} className="animate-fade-in-up relative rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(fullPath(file.name))}
                            onChange={() => toggleSelected(file)}
                            className="mt-1 h-4 w-4 rounded border-neutral-300 bg-white text-neutral-800 dark:border-white/10 dark:bg-white/5"
                          />
                          <button onClick={() => navigate(file)} className="flex flex-1 items-start gap-3 text-left active:scale-[0.98] transition-transform duration-100">
                            <FileIcon file={file} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{file.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                                <span>{formatSize(file.size) || (file.type === 'directory' ? 'Folder' : 'File')}</span>
                                {file.modified && <span>{formatModified(file.modified)}</span>}
                              </div>
                            </div>
                          </button>
                          <button onClick={() => setMenuTarget((current) => current === file.name ? null : file.name)} className="rounded-lg border border-neutral-200 dark:border-white/10 p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5 dark:hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        {menuTarget === file.name && (
                          <div ref={menuRef} className={`absolute right-3 ${menuPositionClass(index)} z-[400] w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xl dark:border-neutral-700/60 dark:bg-neutral-900`}>
                            {file.type === 'file' && !isImageFile(file.name) && (
                              <button onClick={() => { openTextEditor(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            )}
                            {file.type === 'file' && isImageFile(file.name) && (
                              <button onClick={() => { void openImagePreview(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                              </button>
                            )}
                            <button onClick={() => { void copyPath(fullPath(file.name)); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                              <Copy className="w-3.5 h-3.5" />
                              Copy path
                            </button>
                            <button onClick={() => { setRenameTarget(file); setRenameName(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                              <Pencil className="w-3.5 h-3.5" />
                              Rename
                            </button>
                            {file.type === 'file' && (
                              <button onClick={() => { downloadFile(file.name); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5">
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </button>
                            )}
                            <button onClick={() => { setDeleteTarget(file); setMenuTarget(null) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {editFile && (
        <div className={`panel-overlay-frame z-[260] bg-neutral-100/90 p-3 backdrop-blur dark:bg-neutral-950/90 lg:p-6 ${editorClosing ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'}`}>
          <div className="mx-auto flex h-full w-full max-w-[1800px] min-w-0 flex-col">
            <div className="mb-3 flex items-center justify-end gap-3 rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 text-xs text-neutral-500 shadow-sm dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-400">
              {editorLoading && (
                <div className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading</span>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <div className={editorClosing ? 'animate-modal-out' : 'animate-modal-in'}>
                <EditorPane
                  editFile={editFile}
                  saving={saving}
                  dirty={isDirty}
                  loading={editorLoading}
                  fullScreen
                  onBack={closeEditor}
                  onSave={saveFile}
                  onChange={(value) => setEditFile(current => current ? { ...current, content: value } : current)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 lg:left-56">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedFiles([])} className={secondaryBtnClass}>Clear</button>
              <button onClick={deleteSelected} className={redBtnClass}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete selected
              </button>
            </div>
          </div>
        </div>
      )}

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
        placeholder="filename.txt or folder/file.txt"
        value={newFileName}
        onChange={setNewFileName}
        onConfirm={createFile}
        onClose={() => { setNewFileOpen(false); setNewFileName('') }}
      />

      <NameModal
        open={!!renameTarget}
        title={`Rename "${renameTarget?.name}"`}
        placeholder="new-name or folder/new-name"
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
