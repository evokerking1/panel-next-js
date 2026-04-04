'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, RefreshCw, Search, Tag, X } from 'lucide-react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface StoreAddon {
  id: string
  name: string
  version: string
  description: string
  longDescription: string
  author: string
  status: string
  tags: string[]
  features: string[]
  github: string
  installNote: string
  installed?: boolean
}

const statusClass: Record<string, string> = {
  working: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  beta: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  wip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
}

function markdownToHtml(input: string) {
  if (!input) return ''
  let html = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  html = html.split('\n\n').map((block) => {
    const trimmed = block.trim()
    if (!trimmed) return ''
    if (/^<(h\d|ul)/.test(trimmed)) return trimmed
    return `<p>${trimmed.replace(/\n/g, ' ')}</p>`
  }).join('')

  return html
}

export default function AddonStorePage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()

  const [addons, setAddons] = useState<StoreAddon[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<StoreAddon | null>(null)
  const [workingSlug, setWorkingSlug] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/addons/store/list')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load addon store')
      setAddons(data.addons || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load addon store'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const tags = useMemo(() => {
    const count = new Map<string, number>()
    addons.forEach((addon) => addon.tags.forEach((tag) => count.set(tag, (count.get(tag) || 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
  }, [addons])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return addons.filter((addon) => {
      const matchesQuery = !q || `${addon.name} ${addon.description} ${addon.author} ${addon.tags.join(' ')}`.toLowerCase().includes(q)
      const matchesTag = !activeTag || addon.tags.includes(activeTag)
      return matchesQuery && matchesTag
    })
  }, [addons, search, activeTag])

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function install(slug: string) {
    setWorkingSlug(slug)
    try {
      const res = await fetch('/api/admin/addons/store/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Install failed')
      setAddons((prev) => prev.map((addon) => addon.id === slug ? { ...addon, installed: true } : addon))
      if (selected?.id === slug) setSelected({ ...selected, installed: true })
      showToast('Addon installed.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Install failed'
      showToast(message, 'error')
    } finally {
      setWorkingSlug(null)
    }
  }

  async function uninstall(slug: string) {
    setWorkingSlug(slug)
    try {
      const res = await fetch('/api/admin/addons/store/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Uninstall failed')
      setAddons((prev) => prev.map((addon) => addon.id === slug ? { ...addon, installed: false } : addon))
      if (selected?.id === slug) setSelected({ ...selected, installed: false })
      showToast('Addon uninstalled.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Uninstall failed'
      showToast(message, 'error')
    } finally {
      setWorkingSlug(null)
    }
  }

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-8 sm:px-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-base font-medium text-neutral-800 dark:text-white">Addon Store</h1>
              <p className="mt-1 text-sm text-neutral-500">Browse and install addons from the community registry.</p>
            </div>
            <button
              onClick={refresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:bg-neutral-800/20 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mb-5 flex border-b border-neutral-200 dark:border-neutral-800">
            <Link href="/admin/addons" className="mr-5 px-1 py-2.5 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-300">
              Installed
            </Link>
            <span className="-mb-px border-b-2 border-neutral-800 px-1 py-2.5 text-sm font-medium text-neutral-800 dark:border-white dark:text-white">
              Store
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search addons…"
                className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:focus:border-neutral-600"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag((prev) => prev === tag ? null : tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    activeTag === tag
                      ? 'border-neutral-300 bg-neutral-200 text-neutral-800 dark:border-white/15 dark:bg-white/10 dark:text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-white/5 dark:bg-white/[0.03] dark:text-neutral-400 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-12 text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading addon store…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-sm text-neutral-500 dark:border-white/5 dark:bg-neutral-800/20 dark:text-neutral-400">
              No addons match the current filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800/40">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto] gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-sm font-medium text-neutral-800 dark:border-white/10 dark:bg-neutral-800/50 dark:text-white">
                <span>Name</span>
                <span className="hidden md:block">Author</span>
                <span className="hidden sm:block">Status</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-neutral-100 bg-white dark:divide-white/5 dark:bg-neutral-800/20">
                {filtered.map((addon) => (
                  <div key={addon.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto] gap-3 px-5 py-4">
                    <button onClick={() => setSelected(addon)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-white">{addon.name}</p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{addon.description || 'No description'}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {addon.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
                            <Tag className="h-2.5 w-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                    <div className="hidden md:flex items-center text-sm text-neutral-500 dark:text-neutral-400">{addon.author || 'Unknown'}</div>
                    <div className="hidden sm:flex items-center">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass[addon.status] || statusClass.working}`}>
                        {addon.installed ? 'Installed' : addon.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={addon.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-lg border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {addon.installed ? (
                        <button
                          onClick={() => uninstall(addon.id)}
                          disabled={workingSlug === addon.id}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15"
                        >
                          {workingSlug === addon.id ? 'Removing…' : 'Uninstall'}
                        </button>
                      ) : (
                        <button
                          onClick={() => install(addon.id)}
                          disabled={workingSlug === addon.id}
                          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                        >
                          {workingSlug === addon.id ? 'Installing…' : 'Install'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[min(680px,calc(100vh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-[#1c1c1c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 dark:border-white/5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-neutral-800 dark:text-white">{selected.name}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${selected.installed ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300' : statusClass[selected.status] || statusClass.working}`}>
                    {selected.installed ? 'Installed' : selected.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{selected.author || 'Unknown author'}{selected.version ? ` · v${selected.version}` : ''}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-white/5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="border-b border-neutral-200 px-5 py-4 md:border-b-0 md:border-r dark:border-white/5">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{selected.description || 'No description provided.'}</p>
                {selected.features.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Features</p>
                    <div className="space-y-1.5">
                      {selected.features.map((feature) => (
                        <div key={feature} className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.installNote && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {selected.installNote}
                  </div>
                )}
                <div className="mt-5 flex gap-2">
                  <a href={selected.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10">
                    <ExternalLink className="h-3.5 w-3.5" />
                    GitHub
                  </a>
                  {selected.installed ? (
                    <button onClick={() => void uninstall(selected.id)} disabled={workingSlug === selected.id} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15">
                      {workingSlug === selected.id ? 'Removing…' : 'Uninstall'}
                    </button>
                  ) : (
                    <button onClick={() => void install(selected.id)} disabled={workingSlug === selected.id} className="rounded-xl border border-neutral-200 bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:border-white/10 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                      {workingSlug === selected.id ? 'Installing…' : 'Install'}
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto px-5 py-4">
                <div
                  className="prose prose-sm max-w-none prose-neutral dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(selected.longDescription || selected.description) }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </PanelLayout>
  )
}
