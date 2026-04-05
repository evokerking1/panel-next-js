'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, RefreshCw, X, ChevronRight as ArrowRight, Loader2 } from 'lucide-react'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'

interface CatalogueEntry {
  name: string
  description: string
  author: string
  category: string
  group: string
  subGroup: string
  readme: string
  groupReadme: string
  fullReadme: string
  egg: Record<string, unknown>
}

type ViewMode = 'all' | 'app'

const CAT_CLASSES: Record<string, string> = {
  game: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  application: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  generic: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
}

const CAT_LABELS: Record<string, string> = {
  game: 'Game',
  application: 'App',
  generic: 'Generic',
}

function cap(s: string) {
  return s.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function mdToHtml(md: string): string {
  if (!md) return '<p style="font-style:italic;font-size:12px;color:#a3a3a3">No readme available.</p>'
  let h = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  h = h.replace(/```[\w]*\n([\s\S]*?)```/g, (_: string, c: string) => `<pre><code>${c.trim()}</code></pre>`)
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  h = h.replace(/^---+$/gm, '<hr>')
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  h = h.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
  h = h.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m: string) => `<ul>${m}</ul>`)
  h = h.split('\n\n').map((b: string) => {
    b = b.trim()
    if (!b) return ''
    if (/^<(h[1-6]|ul|ol|pre|hr)/.test(b)) return b
    return `<p>${b.replace(/\n/g, ' ')}</p>`
  }).join('')
  return h
}

function CatBadge({ category }: { category: string }) {
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${CAT_CLASSES[category] || 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'}`}>
      {CAT_LABELS[category] || category}
    </span>
  )
}

export default function ImageStorePage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()

  const [images, setImages] = useState<CatalogueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('app')
  const [statusText, setStatusText] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Group popup state
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupEntries, setGroupEntries] = useState<CatalogueEntry[]>([])
  const [groupReadme, setGroupReadme] = useState('')

  // Single-egg popup state
  const [eggOpen, setEggOpen] = useState(false)
  const [eggEntry, setEggEntry] = useState<CatalogueEntry | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState('')

  async function loadCatalogue() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/admin/images/store/catalogue')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const sorted = (data.images || []).slice().sort((a: CatalogueEntry, b: CatalogueEntry) => a.name.localeCompare(b.name))
      setImages(sorted)
      if (data.builtAt) {
        const age = Math.round((Date.now() - data.builtAt) / 60000)
        setStatusText(`${sorted.length} images · ${age < 1 ? 'fresh' : `${age}m old`}`)
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

  async function installEgg(entry: CatalogueEntry) {
    setInstalling(true)
    setInstallError('')
    try {
      const res = await fetch('/api/admin/images/store/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ egg: entry.egg }),
      })
      const d = await res.json()
      if (res.ok) {
        setEggOpen(false)
        showToast(`"${entry.name}" installed.`, 'success')
      } else {
        setInstallError(d.error || 'Installation failed.')
      }
    } catch {
      setInstallError('Network error.')
    } finally {
      setInstalling(false)
    }
  }

  function openGroup(group: string, entries: CatalogueEntry[]) {
    setGroupTitle(cap(group))
    setGroupEntries(entries.slice().sort((a, b) => a.name.localeCompare(b.name)))
    setGroupReadme(entries[0]?.groupReadme || '')
    setGroupOpen(true)
  }

  function openEgg(entry: CatalogueEntry) {
    setEggEntry(entry)
    setInstallError('')
    setEggOpen(true)
  }

  useEffect(() => { loadCatalogue() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setGroupOpen(false); setEggOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = search.toLowerCase().trim()
  const filtered = images.filter(img => {
    if (!q) return true
    if (view === 'all') return img.name.toLowerCase().includes(q) || (img.description || '').toLowerCase().includes(q) || (img.author || '').toLowerCase().includes(q)
    return img.group.toLowerCase().includes(q) || cap(img.group).toLowerCase().includes(q)
  })

  // For app view: group by top-level group
  const groups = new Map<string, CatalogueEntry[]>()
  filtered.forEach(img => {
    if (!groups.has(img.group)) groups.set(img.group, [])
    groups.get(img.group)!.push(img)
  })
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 pt-5 pb-8">

          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-sm text-neutral-400">
                <Link href="/admin/images" className="hover:text-neutral-600 dark:hover:text-neutral-200 transition">Images</Link>
                <ChevronRight className="w-3 h-3" />
                <span className="text-neutral-600 dark:text-neutral-300">Store</span>
              </div>
              <h1 className="text-base font-medium text-neutral-800 dark:text-white">Image Store</h1>
              <p className="text-sm text-neutral-500 mt-0.5">Browse and install images from the Pterodactyl community.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              {statusText && <span className="text-xs text-neutral-400 hidden sm:block">{statusText}</span>}
              <button onClick={doRefresh} disabled={refreshing || loading}
                className="flex items-center gap-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 px-3 py-2 text-sm font-medium transition disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-0.5 border-b border-neutral-200 dark:border-neutral-700/40 mb-5">
            <Link href="/admin/images"
              className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 border-b-2 border-transparent -mb-px hover:text-neutral-700 dark:hover:text-neutral-300 transition">
              Installed
            </Link>
            <span className="px-4 py-2.5 text-sm font-medium text-neutral-800 dark:text-white border-b-2 border-neutral-800 dark:border-white -mb-px">
              Store
            </span>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition" />
            <div className="flex gap-1 bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] rounded-lg p-0.5">
              {(['all', 'app'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setView(m)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${view === m ? 'bg-white dark:bg-white/10 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                  {m === 'all' ? 'All' : 'By App'}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 py-16 text-neutral-400">
              <Loader2 className="animate-spin h-5 w-5" />
              <span className="text-sm">Loading catalogue…</span>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 px-5 py-6 text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load catalogue</p>
              <p className="text-xs text-red-400/70 mt-1">Check your internet connection and try refreshing.</p>
              <button onClick={loadCatalogue} className="mt-3 text-xs text-red-500 underline">Try again</button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && images.length > 0 && (
            <p className="text-sm text-neutral-500 py-16 text-center">No images match that search.</p>
          )}

          {/* All view — flat table */}
          {!loading && !error && view === 'all' && filtered.length > 0 && (
            <div className="overflow-x-auto shadow-sm rounded-xl border border-neutral-200 dark:border-neutral-800/40">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white hidden sm:table-cell">Category</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white hidden sm:table-cell">Author</th>
                    <th className="px-3 py-3.5 text-left text-sm font-medium text-neutral-800 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {filtered.map((img, i) => (
                    <tr key={i} onClick={() => openEgg(img)}
                      className="hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer">
                      <td className="py-4 pl-6 pr-3 text-sm font-medium text-neutral-800 dark:text-white whitespace-nowrap">{img.name}</td>
                      <td className="px-3 py-4 hidden sm:table-cell"><CatBadge category={img.category} /></td>
                      <td className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400 hidden sm:table-cell whitespace-nowrap">{img.author || '—'}</td>
                      <td className="px-3 py-4">
                        <button type="button" onClick={e => { e.stopPropagation(); openEgg(img) }}
                          className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1.5 text-sm font-medium transition">
                          Install
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* By App view — grouped rows */}
          {!loading && !error && view === 'app' && sortedGroups.length > 0 && (
            <div className="space-y-2">
              {sortedGroups.map(([group, entries]) => (
                <div key={group} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800/40 shadow-sm">
                  <div
                    onClick={() => openGroup(group, entries)}
                    className="flex items-center px-5 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 cursor-pointer transition">
                    <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-white">{cap(group)}</span>
                    <span className="text-xs text-neutral-400 mr-3">{entries.length} image{entries.length !== 1 ? 's' : ''}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Group popup */}
      {groupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setGroupOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-xl w-full max-w-3xl flex flex-col"
            style={{ height: 'min(560px, calc(100vh - 40px))' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">{groupTitle}</p>
                <span className="text-xs text-neutral-400">{groupEntries.length} image{groupEntries.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={() => setGroupOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: sub-image list */}
              <div className="w-60 shrink-0 border-r border-neutral-200 dark:border-white/5 overflow-y-auto p-4 flex flex-col gap-2">
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Images</p>
                {groupEntries.map((entry, i) => {
                  const subLabel = entry.subGroup && entry.subGroup !== entry.group
                    ? entry.subGroup.replace(entry.group + '/', '')
                    : ''
                  return (
                    <div key={i}
                      onClick={() => { setGroupOpen(false); openEgg(entry) }}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-white/5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.04] hover:border-neutral-300 dark:hover:border-white/[0.13] transition">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-800 dark:text-white truncate">{entry.name}</p>
                        {subLabel && <p className="text-[10px] text-neutral-400 font-mono truncate">{subLabel}</p>}
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setGroupOpen(false); openEgg(entry) }}
                        className="shrink-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-1 text-[11px] font-medium transition">
                        Install
                      </button>
                    </div>
                  )
                })}
              </div>
              {/* Right: group readme */}
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-3">README</p>
                <div className="md-prose text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(groupReadme) }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single-egg popup */}
      {eggOpen && eggEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEggOpen(false)}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-xl w-full max-w-lg flex flex-col"
            style={{ height: 'min(500px, calc(100vh - 40px))' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{eggEntry.name}</p>
                <CatBadge category={eggEntry.category} />
              </div>
              <button onClick={() => setEggOpen(false)} className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {eggEntry.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{eggEntry.description}</p>
              )}
              {eggEntry.author && (
                <p className="text-[11px] text-neutral-400">by {eggEntry.author}</p>
              )}
              <div className="flex-1">
                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">README</p>
                <div className="md-prose text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(eggEntry.fullReadme || eggEntry.readme || '') }} />
              </div>
              {installError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{installError}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/5 shrink-0">
              <button onClick={() => installEgg(eggEntry)} disabled={installing}
                className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 py-2.5 text-sm font-medium transition disabled:opacity-60">
                {installing ? 'Installing…' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .md-prose h1, .md-prose h2 { font-size: 13px; font-weight: 600; color: #171717; margin: 0 0 6px; }
        .dark .md-prose h1, .dark .md-prose h2 { color: #e5e5e5; }
        .md-prose h3 { font-size: 12px; font-weight: 600; color: #525252; margin: 10px 0 3px; }
        .dark .md-prose h3 { color: #a3a3a3; }
        .md-prose p { margin: 0 0 8px; font-size: 12.5px; }
        .md-prose a { color: #7c3aed; text-decoration: none; }
        .md-prose a:hover { text-decoration: underline; }
        .md-prose code { font-family: ui-monospace,monospace; font-size: 11px; background: #f4f4f5; padding: 1px 5px; border-radius: 4px; color: #3f3f46; }
        .dark .md-prose code { background: rgba(255,255,255,0.07); color: #d4d4d4; }
        .md-prose pre { background: #f4f4f5; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px 12px; overflow-x: auto; margin: 0 0 8px; }
        .dark .md-prose pre { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07); }
        .md-prose pre code { background: none; padding: 0; }
        .md-prose ul, .md-prose ol { padding-left: 16px; margin: 0 0 8px; }
        .md-prose li { margin-bottom: 2px; font-size: 12.5px; }
        .md-prose hr { border: none; border-top: 1px solid #e5e5e5; margin: 10px 0; }
        .dark .md-prose hr { border-top-color: rgba(255,255,255,0.06); }
        .md-prose strong { color: #171717; }
        .dark .md-prose strong { color: #e5e5e5; }
      `}</style>
    </PanelLayout>
  )
}
