'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'

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
    setSaving(true)
    const res = await fetch('/api/admin/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    const d = await res.json()
    if (res.ok) {
      setImages(prev => [...prev, d.image])
      setCreateOpen(false)
      setNewName('')
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
      <div className="flex-1 p-6 overflow-y-auto pt-16">

        <div className="sm:flex sm:items-center px-8 pt-4 gap-4">
          <div className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Images</h1>
            <p className="mt-1 text-sm text-neutral-500">Manage server images installed on this panel</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2 flex-wrap">
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

        <div className="mx-8 mt-6 flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <span className="px-1 py-2.5 text-sm font-medium text-neutral-800 dark:text-white border-b-2 border-neutral-800 dark:border-white -mb-px">
            Installed <span className="ml-1 text-xs text-neutral-400">{images.length}</span>
          </span>
          <Link href="/admin/images/store"
            className="px-1 py-2.5 text-sm font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border-b-2 border-transparent -mb-px transition">
            Store
          </Link>
        </div>

        {images.length > 0 && (
          <div className="mx-8 mt-4">
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
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
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
            <div className="hidden sm:block overflow-x-auto shadow-sm rounded-xl m-8 border border-neutral-200 dark:border-neutral-800/40">
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
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                            </Link>
                            <button onClick={() => setDeleteTarget(img)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
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
            <div className="sm:hidden px-4 mt-4 space-y-2">
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
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                        </Link>
                        <button onClick={() => setDeleteTarget(img)}
                          className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
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
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-4">New Image</h2>
              <label className="block text-xs text-neutral-500 mb-1">Name</label>
              <input
                className="w-full rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 px-3 py-2 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition mb-4"
                placeholder="e.g. Minecraft Java"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setCreateOpen(false); setNewName('') }}
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
