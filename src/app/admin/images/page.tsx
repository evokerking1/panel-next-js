'use client'

import { Box, Pencil, Trash2 , Loader2} from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/modal'

interface Image {
  id: number
  name: string
  author?: string
  description?: string
  dockerImages?: string
  startup?: string
}

export default function AdminImagesPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [images, setImages] = useState<Image[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Image | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newStartup, setNewStartup] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/images')
      .then(r => r.json())
      .then(d => setImages(d.images || []))
      .catch(() => showToast('Failed to load images', 'error'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpload(file: File) {
    const text = await file.text()
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { showToast('Invalid JSON file', 'error'); return }
    const res = await fetch('/api/admin/images?action=upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
    const d = await res.json()
    if (res.ok) {
      if (d.image) setImages(prev => [...prev.filter(i => i.id !== d.image.id), d.image])
      showToast('Image imported.', 'success')
    } else {
      showToast(d.error || 'Import failed.', 'error')
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { showToast('Name required', 'error'); return }
    if (!newStartup.trim()) { showToast('Startup command required', 'error'); return }
    setSaving(true)
    const res = await fetch('/api/admin/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, author: newAuthor, startup: newStartup, description: newDescription }),
    })
    const d = await res.json()
    if (res.ok) {
      setImages(prev => [...prev, d.image])
      setCreateOpen(false)
      setNewName(''); setNewAuthor(''); setNewStartup(''); setNewDescription('')
      showToast('Image created.', 'success')
      if (d.image?.id) router.push(`/admin/images/${d.image.id}`)
    } else {
      showToast(d.error || 'Failed to create image.', 'error')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/images/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setImages(prev => prev.filter(i => i.id !== deleteTarget.id))
      showToast('Image deleted.', 'success')
    } else {
      showToast('Failed to delete image.', 'error')
    }
    setDeleteTarget(null)
  }

  const filtered = filter
    ? images.filter(img => img.name.toLowerCase().includes(filter.toLowerCase()) || (img.author || '').toLowerCase().includes(filter.toLowerCase()))
    : images

  return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">

        <div className="panel-toolbar">
          <div className="panel-page-heading">
            <h1 className="panel-page-title">Images</h1>
            <p className="panel-page-subtitle">Manage server images installed on this panel</p>
          </div>
          <div className="panel-toolbar-actions">
            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
            <button
              onClick={() => fileRef.current?.click()}
              className="border border-neutral-200 dark:border-neutral-800/40 rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm font-medium transition">
              Upload JSON
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="border border-neutral-200 dark:border-neutral-800/40 rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm font-medium transition">
              New Image
            </button>
            <Link href="/admin/images/store"
              className="border border-neutral-200 dark:border-neutral-800/40 rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm font-medium transition">
              Browse Store
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <span className="px-1 py-2.5 text-sm font-medium text-neutral-800 dark:text-white border-b-2 border-neutral-800 dark:border-white -mb-px">
            Installed <span className="ml-1 text-xs text-neutral-400">{images.length}</span>
          </span>
          <Link href="/admin/images/store"
            className="px-1 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border-b-2 border-transparent -mb-px transition">
            Store
          </Link>
        </div>

        {images.length > 0 && (
          <div>
            <input
              type="text"
              placeholder="Filter images…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Box className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500">{filter ? 'No images match that filter.' : 'No images installed yet.'}</p>
            {!filter && (
              <div className="flex gap-2 mt-4">
                <button onClick={() => setCreateOpen(true)}
                  className="border border-neutral-200 dark:border-neutral-800/40 rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm font-medium transition">
                  Create an image
                </button>
                <Link href="/admin/images/store"
                  className="border border-neutral-200 dark:border-neutral-800/40 rounded-xl bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 px-3 py-2 text-sm font-medium transition">
                  Browse store
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block panel-table-shell overflow-x-auto shadow-sm">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Author</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Docker Images</th>
                    <th className="relative py-3.5 pl-3 pr-6"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {filtered.map((img, idx) => {
                    let dockerList: string[] = []
                    try { dockerList = img.dockerImages ? JSON.parse(img.dockerImages) : [] } catch {}
                    return (
                      <tr key={img.id} className="img-row hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors" style={{ '--i': idx } as React.CSSProperties}>
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                          <p className="font-medium text-neutral-800 dark:text-white">{img.name}</p>
                          {img.description && <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">{img.description}</p>}
                        </td>
                        <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">{img.author || '—'}</td>
                        <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                          <span className="text-xs font-mono">{dockerList.length} image{dockerList.length !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="py-4 pl-3 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/admin/images/${img.id}`}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button onClick={() => setDeleteTarget(img)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {filtered.map(img => {
                let dockerList: string[] = []
                try { dockerList = img.dockerImages ? JSON.parse(img.dockerImages) : [] } catch {}
                return (
                  <div key={img.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-800/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{img.name}</p>
                        {img.author && <p className="text-xs text-neutral-500 mt-0.5">{img.author}</p>}
                        {img.description && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{img.description}</p>}
                        <p className="text-xs text-neutral-400 mt-2 font-mono">{dockerList.length} docker image{dockerList.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/admin/images/${img.id}`}
                          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteTarget(img)}
                          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Create modal */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-xl w-full max-w-[460px] p-6">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">New Image</h2>
              <p className="text-xs text-neutral-500 mb-4">Configure Docker images and variables after creation.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs text-neutral-500 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                    placeholder="e.g. Minecraft Java"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Author</label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                    placeholder="e.g. github.com/you"
                    value={newAuthor}
                    onChange={e => setNewAuthor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Startup Command <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition font-mono"
                    placeholder="java -Xms128M -jar server.jar"
                    value={newStartup}
                    onChange={e => setNewStartup(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-neutral-500 mb-1">Description</label>
                  <textarea
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition resize-none"
                    placeholder="What does this image run?"
                    rows={2}
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCreateOpen(false); setNewName(''); setNewAuthor(''); setNewStartup(''); setNewDescription('') }}
                  className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                  {saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal open={!!deleteTarget} title="Delete image?"
          body={`Delete "${deleteTarget?.name}"? Servers using this image will not be affected.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
