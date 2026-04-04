'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Search, ChevronLeft } from 'lucide-react'

interface ServerResult {
  UUID: string
  name: string
  Suspended: boolean
}

function DesktopThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    function onThemeChange(e: Event) { setDark((e as CustomEvent).detail.theme === 'dark') }
    window.addEventListener('theme-changed', onThemeChange)
    return () => window.removeEventListener('theme-changed', onThemeChange)
  }, [])
  function toggle() {
    if (typeof window !== 'undefined' && window.toggleTheme) window.toggleTheme()
  }
  return (
    <button onClick={toggle}
      className="fixed right-4 top-4 w-14 h-8 hidden lg:flex items-center bg-neutral-300 dark:bg-neutral-700/70 rounded-full p-1 transition-colors duration-500 z-50"
      aria-label="Toggle theme">
      <span className="bg-white w-6 h-6 rounded-full shadow-md border border-neutral-950/20 transform transition-transform duration-500"
        style={{ transform: dark ? 'translateX(24px)' : 'translateX(0)' }} />
    </button>
  )
}

export default function Topbar() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ServerResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [settings, setSettings] = useState<{ title?: string; logo?: string } | null>(null)
  const [mobileDark, setMobileDark] = useState(false)
  const router = useRouter()
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/public/settings').then(r => r.json()).then(d => { if (d) setSettings(d) }).catch(() => {})
    setMobileDark(document.documentElement.classList.contains('dark'))
    function onThemeChange(e: Event) { setMobileDark((e as CustomEvent).detail.theme === 'dark') }
    window.addEventListener('theme-changed', onThemeChange)
    return () => window.removeEventListener('theme-changed', onThemeChange)
  }, [])

  function toggleMobileTheme() {
    if (typeof window !== 'undefined' && window.toggleTheme) window.toggleTheme()
  }

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    fetch('/api/user/servers')
      .then(r => r.json())
      .then(d => {
        const all: ServerResult[] = d.servers || []
        setResults(all.filter(s =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.UUID.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 6))
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); desktopInputRef.current?.focus() }
      if (e.key === 'Escape') { setShowResults(false); closeMobileSearch() }
    }
    function onClickOut(e: MouseEvent) {
      if (!desktopInputRef.current?.contains(e.target as Node) && !resultsRef.current?.contains(e.target as Node)) setShowResults(false)
    }
    window.addEventListener('keydown', onKeydown)
    document.addEventListener('click', onClickOut)
    return () => { window.removeEventListener('keydown', onKeydown); document.removeEventListener('click', onClickOut) }
  }, [])

  function openMobileSearch() {
    setMobileSearchOpen(true)
    setQuery('')
    setResults([])
    setTimeout(() => mobileInputRef.current?.focus(), 60)
  }

  function closeMobileSearch() {
    setMobileSearchOpen(false)
    setQuery('')
    setResults([])
  }

  function handleResultClick(uuid: string) {
    router.push(`/server/${uuid}`)
    setShowResults(false)
    setQuery('')
    closeMobileSearch()
  }

  const logo = settings?.logo || '/assets/logo.png'
  const title = settings?.title || 'Airlink'
  const avatarSrc = user ? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.username)}` : ''

  return (
    <>
      <DesktopThemeToggle />

      {/* ── MOBILE TOP BAR ── */}
      <div className="mobile-top-bar lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white/8 dark:bg-[#141414]/8 backdrop-blur-xl border-b border-neutral-200/30 dark:border-white/5">

        <div id="topbar-default" className={`${mobileSearchOpen ? 'hidden' : 'flex'} items-center justify-between h-14 px-4`}>
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            <img src={logo} alt="Logo"
              className="h-8 w-8 rounded-lg bg-neutral-950/90 dark:bg-transparent p-0.5 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span className="text-sm font-medium text-neutral-800 dark:text-white truncate">{title}</span>
          </Link>
          <div className="flex items-center gap-2.5 shrink-0">
            <button onClick={openMobileSearch}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition active:scale-90 transition-transform duration-100">
              <Search className="h-5 w-5" />
            </button>
            <button onClick={toggleMobileTheme}
              className="w-11 h-6 flex items-center bg-gray-300 dark:bg-neutral-700/70 rounded-full p-1 transition-colors duration-500 active:scale-[0.96] transition-transform duration-100">
              <span className="dot bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-500 border border-neutral-950/20"
                style={{ transform: mobileDark ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
            {user && (
              <Link href="/account">
                <img className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-700"
                  src={avatarSrc} alt="Avatar" />
              </Link>
            )}
          </div>
        </div>

        <div id="topbar-search" className={`${mobileSearchOpen ? 'flex' : 'hidden'} items-center h-14 px-3 gap-2`}>
          <button onClick={closeMobileSearch} className="p-1.5 text-neutral-500 dark:text-neutral-400 shrink-0 active:scale-90 transition-transform duration-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2 gap-2">
            <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            <input ref={mobileInputRef} type="search" autoComplete="off" placeholder="Search navigation..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowResults(true) }}
              onBlur={() => setTimeout(() => closeMobileSearch(), 0)}
              className="flex-1 bg-transparent text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none" />
          </div>
        </div>

        {mobileSearchOpen && query.length > 0 && (
          <div className="animate-dropdown-in fixed top-14 left-0 right-0 z-40 bg-white/8 dark:bg-[#141414]/8 backdrop-blur-xl border-b border-neutral-200/30 dark:border-white/5 max-h-[60dvh] overflow-y-auto shadow-lg">
            {searching ? (
              <p className="px-4 py-3 text-sm text-neutral-400">Searching...</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-400">No results.</p>
            ) : results.map(s => (
              <button key={s.UUID} onClick={() => handleResultClick(s.UUID)}
                className="flex items-center gap-3 w-full px-4 py-3 border-b border-neutral-100 dark:border-white/5 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/5 transition text-left active:scale-[0.98] transition-transform duration-100">
                <span className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${s.Suspended ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="text-sm text-neutral-800 dark:text-white flex-1 truncate">{s.name}
                  {s.Suspended && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
                      Suspended
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-400 font-mono shrink-0">{s.UUID.split('-')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── DESKTOP TOP BAR ── */}
      <div className="hidden lg:flex fixed top-0 left-56 right-0 z-40 h-16 shrink-0 items-center gap-x-4 bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-white/5 px-4">
        <div className="flex flex-1 gap-x-4 self-stretch">
          <div className="relative flex flex-1 flex-col">
            <div className="lg:-ml-2 flex items-center w-fit mt-3.5 px-4 py-2 h-10 rounded-xl border border-neutral-300 dark:border-white/5 duration-200 hover:border-neutral-400 dark:hover:border-neutral-300/10 bg-transparent">
              <Search className="h-5 w-5 text-neutral-400 shrink-0" />
              <input ref={desktopInputRef} value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                className="bg-transparent border-none ring-0 ml-2 focus:outline-none sm:text-sm placeholder:text-zinc-500 text-neutral-700 dark:text-neutral-300 w-48"
                placeholder="Search" type="search" autoComplete="off" />
              <span className="ml-2 px-1 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 whitespace-nowrap">CTRL K</span>
            </div>
            {showResults && query.length > 0 && (
              <div ref={resultsRef}
                className="animate-dropdown-in absolute bg-white dark:bg-neutral-900 w-72 rounded-xl shadow-2xl shadow-neutral-200/80 dark:shadow-black/40 mt-12 px-2 pb-2 border border-neutral-200 dark:border-neutral-700/60 z-50">
                {searching ? (
                  <p className="text-xs text-neutral-400 px-2 py-3">Searching...</p>
                ) : results.length === 0 ? (
                  <p className="text-xs text-neutral-400 px-2 py-3">No servers found.</p>
                ) : results.map(s => (
                  <button key={s.UUID} onClick={() => handleResultClick(s.UUID)}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition active:scale-[0.98] transition-transform duration-100">
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${s.Suspended ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm text-neutral-800 dark:text-neutral-200 flex-1 truncate">{s.name}
                      {s.Suspended && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/20 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
                          Suspended
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono shrink-0">{s.UUID.split('-')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
