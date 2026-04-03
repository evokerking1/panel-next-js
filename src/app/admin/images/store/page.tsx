'use client'

import { CheckCircle2, Download, Info, RefreshCw, ChevronRight, X , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface CatalogueImage {
  id: string
  name: string
  author?: string
  description?: string
  category?: string
  readme?: string
  eggs?: { name: string; description?: string }[]
}

type ViewMode = 'all' | 'game' | 'application' | 'generic'

export default function ImageStorePage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()

  const [images, setImages] = useState<CatalogueImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('all')
  const [statusText, setStatusText] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [selected, setSelected] = useState<CatalogueImage | null>(null)

  async function loadCatalogue() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/admin/images/store/catalogue')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const sorted = (data.images || []).slice().sort((a: CatalogueImage, b: CatalogueImage) => a.name.localeCompare(b.name))
      setImages(sorted)
      if (data.builtAt) {
        const age = Math.round((Date.now() - data.builtAt) / 60000)
        setStatusText(`${sorted.length} images · ${age < 1 ? 'fresh' : age + 'm old'}`)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function doRefresh() {
    setRefreshing(true)
    setStatusText('Refreshing…')
    try {
      await fetch('/api/admin/images/store/refresh', { method: 'POST' })
      await loadCatalogue()
    } catch {
      showToast('Refresh failed.', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  async function installImage(img: CatalogueImage) {
    setInstalling(img.id)
    try {
      const res = await fetch(`/api/admin/images/store/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: img.id }),
      })
      const d = await res.json()
      if (res.ok) {
        showToast(`${img.name} installed.`, 'success')
        setSelected(null)
      } else {
        showToast(d.error || 'Install failed.', 'error')
      }
    } catch {
      showToast('Install failed.', 'error')
    } finally {
      setInstalling(null)
    }
  }

  useEffect(() => { loadCatalogue() }, [])

  const filtered = images.filter(img => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      img.name.toLowerCase().includes(q) ||
      (img.description || '').toLowerCase().includes(q) ||
      (img.author || '').toLowerCase().includes(q)
    const imgCategory = (img.category || '').toLowerCase()
    const matchView = view === 'all' || imgCategory === view
    return matchSearch && matchView
  })

  const viewTabs: { key: ViewMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'game', label: 'Games' },
    { key: 'application', label: 'Apps' },
    { key: 'generic', label: 'Generic' },
  ]

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-5 pb-8">

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/admin/images" className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                  Images
                </Link>
                <ChevronRight className="w-3 h-3 text-neutral-400" />
                <span className="text-sm text-neutral-600 dark:text-neutral-300">Store</span>
              </div>
              <h1 className="text-base font-medium text-neutral-800 dark:text-white">Image Store</h1>
              <p className="text-sm text-neutral-500 mt-0.5">Browse and install pre-built server images</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusText && <span className="text-xs text-neutral-400 hidden sm:block">{statusText}</span>}
              <button onClick={doRefresh} disabled={refreshing}
                className="flex items-center gap-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm font-medium transition">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input type="text" placeholder="Search images…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition" />
            <div className="flex gap-1">
              {viewTabs.map(t => (
                <button key={t.key} onClick={() => setView(t.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${view === t.key ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-white/5'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-16 text-neutral-400">
              <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
              <span className="text-sm">Loading catalogue…</span>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 px-5 py-5 text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load catalogue</p>
              <p className="text-xs text-red-400/70 mt-1">Check your internet connection and try refreshing.</p>
              <button onClick={loadCatalogue} className="mt-3 text-xs text-red-500 hover:text-red-400 underline transition">Try again</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-neutral-500">{search ? 'No images match that search.' : 'No images available.'}</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(img => (
                <button key={img.id} onClick={() => setSelected(img)}
                  className="text-left rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-800/20 p-4 hover:border-neutral-300 dark:hover:border-neutral-600/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white group-hover:text-neutral-900 dark:group-hover:text-white">{img.name}</p>
                    {img.category && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 shrink-0 capitalize">
                        {img.category}
                      </span>
                    )}
                  </div>
                  {img.description && <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{img.description}</p>}
                  {img.author && <p className="text-[11px] text-neutral-400 mt-2">{img.author}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail/install modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <div>
                <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">{selected.name}</h2>
                {selected.author && <p className="text-xs text-neutral-400 mt-0.5">{selected.author}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {selected.description && <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{selected.description}</p>}
              {selected.eggs && selected.eggs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 mb-2">Includes {selected.eggs.length} egg{selected.eggs.length !== 1 ? 's' : ''}</p>
                  <div className="space-y-1.5">
                    {selected.eggs.map((egg, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 dark:border-white/5 px-3 py-2">
                        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{egg.name}</p>
                        {egg.description && <p className="text-[11px] text-neutral-400 mt-0.5">{egg.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/5 flex gap-2 justify-end">
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                Cancel
              </button>
              <button onClick={() => installImage(selected)} disabled={installing === selected.id}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                {installing === selected.id ? 'Installing…' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
