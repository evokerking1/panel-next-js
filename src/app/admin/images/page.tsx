'use client'

import { useState, useEffect, useRef } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

interface ImageData {
  id: number
  UUID: string
  name?: string
  description?: string
  author?: string
  authorName?: string
  startup?: string
  createdAt: string
}

export default function AdminImagesPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [images, setImages] = useState<ImageData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ImageData | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function load() {
    fetch('/api/admin/images').then(r => r.json()).then(d => setImages(d.images || [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/admin/images?action=upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const d = await res.json()
      if (res.ok) { showToast(d.message || 'Image imported.', 'success'); load() }
      else showToast(d.error || 'Import failed.', 'error')
    } catch {
      showToast('Invalid JSON file.', 'error')
    }
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/images/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Image deleted.', 'success'); load() }
    else showToast('Failed to delete image.', 'error')
    setDeleteTarget(null)
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Images</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Docker images and egg configurations</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleUpload} className="hidden" id="egg-upload" />
            <label htmlFor="egg-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer">
              {uploadLoading
                ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75a.75.75 0 0 1 .75.75v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V16.5a.75.75 0 0 1 1.5 0v2.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V16.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>}
              Import egg
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-neutral-500">No images yet.</p>
            <p className="text-xs text-neutral-400 mt-1">Import an egg JSON file to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {images.map(img => (
              <div key={img.id} className="bg-white dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 rounded-xl p-4 hover:border-neutral-300 dark:hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">{img.name || `Image ${img.id}`}</h3>
                    {img.authorName && <p className="text-xs text-neutral-500 mt-0.5">by {img.authorName}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Link href={`/admin/images/${img.id}`} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                    </Link>
                    <button onClick={() => setDeleteTarget(img)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
                {img.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2">{img.description}</p>}
                {img.startup && <p className="text-[10px] font-mono text-neutral-400 truncate">{img.startup}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} title="Delete image?"
        body={`Delete "${deleteTarget?.name}"? Servers using this image will not be affected but may fail to reinstall.`}
        confirmLabel="Delete" danger onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
    </PanelLayout>
  )
}
