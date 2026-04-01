'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const userNavItems = [
  {
    label: 'Servers',
    url: '/dashboard',
    matchPrefix: '/dashboard',
    matchPrefixAlso: '/server',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mt-0.5">
        <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
      </svg>
    ),
  },
  {
    label: 'Credits',
    url: '/credits',
    matchPrefix: '/credits',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mt-0.5">
        <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568 6.787 6.787 0 0 1 1.019-4.38Z" clipRule="evenodd" />
        <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135 9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135 3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
      </svg>
    ),
  },
]

const adminNavItems = [
  { label: 'Overview', desc: 'Panel stats and activity', url: '/admin/overview', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg> },
  { label: 'Settings', desc: 'Panel configuration', url: '/admin/settings', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg> },
  { label: 'Servers', desc: 'Manage all servers', url: '/admin/servers', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" /></svg> },
  { label: 'Users', desc: 'Manage accounts', url: '/admin/users', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg> },
  { label: 'Nodes', desc: 'Daemon nodes', url: '/admin/nodes', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" /></svg> },
  { label: 'Images', desc: 'Docker images', url: '/admin/images', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg> },
  { label: 'Addons', desc: 'Extensions and plugins', url: '/admin/addons', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 4.126-.33c-.206-1.578-.322-3.174-.346-4.777a.637.637 0 0 1 .7-.631v0c.355 0 .676.186.959.401.29.221.634.349 1.003.349 1.035 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25c-.37 0-.713.128-1.003.349-.283.215-.604.401-.96.401v0a.656.656 0 0 1-.658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" /></svg> },
  { label: 'API Keys', desc: 'Access tokens', url: '/admin/apikeys', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg> },
  { label: 'Analytics', desc: 'Server and node stats', url: '/admin/analytics', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const bgRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const { user, loading, logout } = useAuth({ require: true })
  const [settings, setSettings] = useState<{ title?: string; logo?: string } | null>(null)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    fetch('/api/public/settings')
      .then(r => r.json())
      .then(d => { if (d) setSettings(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    function onThemeChange(e: Event) {
      setIsDark((e as CustomEvent).detail.theme === 'dark')
    }
    window.addEventListener('theme-changed', onThemeChange)
    return () => window.removeEventListener('theme-changed', onThemeChange)
  }, [])

  useEffect(() => {
    const bg = bgRef.current
    const nav = navRef.current
    if (!bg || !nav) return
    const activeLink = nav.querySelector<HTMLElement>('.nav-link[data-active="true"]')
    if (!activeLink) { bg.style.opacity = '0'; return }
    const navRect = nav.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    bg.style.top = `${linkRect.top - navRect.top + nav.scrollTop}px`
    bg.style.opacity = '1'
  }, [pathname])

  if (loading || !user) return null

  function isActive(url: string, matchPrefix?: string, matchPrefixAlso?: string) {
    if (matchPrefix && pathname.startsWith(matchPrefix)) return true
    if (matchPrefixAlso && pathname.startsWith(matchPrefixAlso)) return true
    return pathname === url || pathname.startsWith(url + '/')
  }

  const avatarSrc = user.avatar
    ? (user.avatar.startsWith('/') ? user.avatar : `/${user.avatar}`)
    : `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.username)}`

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <div id="pc-sidebar" className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-56 lg:flex-col left-0">
        <div className="flex flex-col h-full bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl border-r border-neutral-200/30 dark:border-white/5">

          <div className="pl-6 pt-4 pb-4 flex items-center justify-between min-w-0 shrink-0 pr-4">
            <Link href="/dashboard" className="flex items-center min-w-0">
              {settings?.logo ? (
                <img src={settings.logo} alt="Logo"
                  className="h-10 w-10 rounded-xl mr-3 shrink-0 bg-neutral-950/90 p-1 dark:bg-transparent"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              ) : (
                <div className="h-10 w-10 rounded-xl mr-3 shrink-0 bg-neutral-900 dark:bg-white/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white dark:text-neutral-200">
                    <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
                  </svg>
                </div>
              )}
              <h1 className="text-neutral-700 dark:text-white font-medium tracking-tight text-lg truncate min-w-0">
                {settings?.title || 'Airlink'}
              </h1>
            </Link>

            <button
              onClick={() => { if (typeof window !== 'undefined' && window.toggleTheme) window.toggleTheme() }}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
              title="Toggle theme"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>
          </div>

          <Link href="/account"
            className="flex items-center space-x-3 py-3 px-4 border-y border-neutral-800/10 dark:border-white/5 shrink-0 hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors group"
            style={isActive('/account') ? { background: 'rgba(0,0,0,0.06)' } : {}}>
            <img className="h-8 w-8 rounded-xl border border-neutral-700/10 shrink-0 object-cover" src={avatarSrc} alt="Avatar" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-700 dark:text-white truncate">
                {user.username}
                <span className="text-xs text-neutral-500"><sup className="mt-1">#{String(user.id).padStart(4, '0')}</sup></span>
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{user.description || 'No description'}</p>
            </div>
          </Link>

          <nav className="flex-1 overflow-y-auto">
            <ul role="list" className="py-2" ref={navRef}>
              <li>
                <ul role="list" className="-mx-2 space-y-1 relative">
                  <div ref={bgRef} id="active-background"
                    className="ml-1.5 absolute left-2 w-[calc(97%-1.5rem)] h-9 z-[-1] bg-neutral-200 border border-neutral-300 dark:bg-white/5 dark:border-neutral-300/5 rounded-xl opacity-0"
                    style={{ top: 0, transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), height 0.18s ease, opacity 0.15s ease' }} />

                  {userNavItems.map(item => (
                    <li key={item.url} className="nav-item">
                      <Link href={item.url}
                        className="nav-link mt-1 text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white px-4 mx-4 group flex gap-x-3 py-1.5 rounded-xl text-sm leading-6 font-normal transition-all duration-200"
                        data-active={isActive(item.url, item.matchPrefix, item.matchPrefixAlso) ? 'true' : 'false'}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}

                  {user.isAdmin && (
                    <>
                      <p className="pl-8 text-neutral-600 dark:text-neutral-400 text-xs font-medium pt-6 pb-2">Admin Panel</p>
                      {adminNavItems.map(item => (
                        <li key={item.url}>
                          <Link href={item.url}
                            className="nav-link transition mt-1 text-neutral-600 dark:text-neutral-400 px-4 mx-4 group flex gap-x-3 py-1.5 rounded-xl text-sm leading-6 font-normal"
                            data-active={isActive(item.url) ? 'true' : 'false'}>
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </li>
            </ul>
          </nav>

          <div className="shrink-0 border-t border-neutral-800/10 dark:border-white/5">
            <button onClick={() => logout()}
              className="group flex gap-x-3 pl-6 py-4 w-full text-left text-sm font-medium leading-6 text-neutral-500 hover:text-red-700 dark:hover:text-red-500/80 hover:bg-red-500/5 dark:hover:bg-neutral-700/10 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mt-0.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/80 dark:bg-[#141414]/80 backdrop-blur-xl border-t border-neutral-200/30 dark:border-white/5">
        <ul className="flex items-center justify-around h-16">

          <li className="flex-1">
            <Link href="/dashboard"
              className={`mobile-nav-link flex flex-col items-center justify-center h-16 gap-1 ${isActive('/dashboard', '/dashboard', '/server') ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
              </svg>
              <span className="text-[10px] font-medium">Servers</span>
            </Link>
          </li>

          {user.isAdmin && (
            <li className="flex-1">
              <Link href="/admin/menu"
                className={`mobile-nav-link flex flex-col items-center justify-center h-16 gap-1 ${pathname.startsWith('/admin') ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                <span className="text-[10px] font-medium">Admin</span>
              </Link>
            </li>
          )}

          <li className="flex-1">
            <button onClick={() => logout()}
              className="mobile-nav-link flex flex-col items-center justify-center w-full h-16 gap-1 text-neutral-500 dark:text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </li>

        </ul>
      </nav>
    </>
  )
}
