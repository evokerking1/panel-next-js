'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Server, Coins, LayoutDashboard, Settings, Users, Network, Box,
  Puzzle, Key, BarChart3, LogOut, Sun, Moon,
} from 'lucide-react'

const userNavItems = [
  { label: 'Servers', url: '/dashboard', matchPrefix: '/dashboard', matchPrefixAlso: '/server', icon: <Server className="w-5 h-5 mt-0.5" /> },
  { label: 'Credits', url: '/credits', matchPrefix: '/credits', icon: <Coins className="w-5 h-5 mt-0.5" /> },
]

const adminNavItems = [
  { label: 'Overview',  desc: 'Panel stats and activity',   url: '/admin/overview',  icon: <LayoutDashboard className="w-5 h-5 mt-0.5" /> },
  { label: 'Settings',  desc: 'Panel configuration',        url: '/admin/settings',  icon: <Settings className="w-5 h-5 mt-0.5" /> },
  { label: 'Servers',   desc: 'Manage all servers',         url: '/admin/servers',   icon: <Server className="w-5 h-5 mt-0.5" /> },
  { label: 'Users',     desc: 'Manage accounts',            url: '/admin/users',     icon: <Users className="w-5 h-5 mt-0.5" /> },
  { label: 'Nodes',     desc: 'Daemon nodes',               url: '/admin/nodes',     icon: <Network className="w-5 h-5 mt-0.5" /> },
  { label: 'Images',    desc: 'Docker images',              url: '/admin/images',    icon: <Box className="w-5 h-5 mt-0.5" /> },
  { label: 'Addons',    desc: 'Extensions and plugins',     url: '/admin/addons',    icon: <Puzzle className="w-5 h-5 mt-0.5" /> },
  { label: 'API Keys',  desc: 'Access tokens',              url: '/admin/apikeys',   icon: <Key className="w-5 h-5 mt-0.5" /> },
  { label: 'Analytics', desc: 'Server and node stats',      url: '/admin/analytics', icon: <BarChart3 className="w-5 h-5 mt-0.5" /> },
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

  useLayoutEffect(() => {
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
                  <Server className="w-5 h-5 text-white dark:text-neutral-200" />
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
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
              <LogOut className="w-5 h-5 mt-0.5 shrink-0" />
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
              <Server className="w-5 h-5" />
              <span className="text-[10px] font-medium">Servers</span>
            </Link>
          </li>

          {user.isAdmin && (
            <li className="flex-1">
              <Link href="/admin/menu"
                className={`mobile-nav-link flex flex-col items-center justify-center h-16 gap-1 ${pathname.startsWith('/admin') ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] font-medium">Admin</span>
              </Link>
            </li>
          )}

          <li className="flex-1">
            <button onClick={() => logout()}
              className="mobile-nav-link flex flex-col items-center justify-center w-full h-16 gap-1 text-neutral-500 dark:text-neutral-400">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </li>

        </ul>
      </nav>
    </>
  )
}
