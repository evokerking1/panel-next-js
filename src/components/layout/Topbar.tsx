'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  function toggle() {
    const nowDark = !dark
    setDark(nowDark)
    document.documentElement.classList.toggle('dark', nowDark)
    try { localStorage.setItem('theme', nowDark ? 'dark' : 'light') } catch {}
  }
  return (
    <button onClick={toggle}
      className="fixed right-4 top-4 w-14 h-8 flex items-center bg-neutral-300 dark:bg-neutral-700/70 rounded-full p-1 transition-colors duration-500 z-50"
      aria-label="Toggle theme">
      <span className={`bg-white w-6 h-6 rounded-full shadow-md border border-neutral-950/20 transform transition-transform duration-500 ${dark ? 'translate-x-6' : ''}`} />
    </button>
  )
}

interface ServerResult {
  UUID: string
  name: string
  Suspended: boolean
}

export default function Topbar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ServerResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    function onClickOut(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !resultsRef.current?.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    window.addEventListener('keydown', onKeydown)
    document.addEventListener('click', onClickOut)
    return () => { window.removeEventListener('keydown', onKeydown); document.removeEventListener('click', onClickOut) }
  }, [])

  return (
    <>
      <ThemeToggle />
      <div className="fixed top-0 left-0 lg:left-56 right-0 z-40 flex h-16 shrink-0 items-center gap-x-4 bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-white/5 px-4 sm:px-4 lg:px-4">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="relative flex flex-1 flex-col">
            <div className="lg:-ml-2 flex items-center w-fit mt-3.5 px-4 py-2 h-10 rounded-xl border border-neutral-300 dark:border-white/5 duration-200 hover:border-neutral-400 dark:hover:border-neutral-300/10 bg-transparent">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-neutral-400 shrink-0">
                <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
              </svg>
              <input ref={inputRef} value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setShowResults(true)}
                className="bg-transparent border-none ring-0 ml-2 focus:outline-none sm:text-sm placeholder:text-zinc-500 text-neutral-700 dark:text-neutral-300 w-48"
                placeholder="Search servers..." type="search" autoComplete="off" />
              <span className="ml-2 px-1 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 whitespace-nowrap">⌘ K</span>
            </div>

            {showResults && query.length > 0 && (
              <div ref={resultsRef}
                className="absolute bg-white dark:bg-neutral-900 w-72 rounded-xl shadow-2xl shadow-neutral-200/80 dark:shadow-black/40 mt-12 px-2 pb-2 border border-neutral-200 dark:border-neutral-700/60 z-50">
                {searching ? (
                  <p className="text-xs text-neutral-400 px-2 py-3">Searching...</p>
                ) : results.length === 0 ? (
                  <p className="text-xs text-neutral-400 px-2 py-3">No servers found.</p>
                ) : results.map(s => (
                  <button key={s.UUID}
                    onClick={() => { router.push(`/server/${s.UUID}`); setShowResults(false); setQuery('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition">
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full shrink-0 ${s.Suspended ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm text-neutral-800 dark:text-neutral-200 flex-1 truncate">{s.name}</span>
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
