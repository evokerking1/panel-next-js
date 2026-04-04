'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Terminal, Folder, Rocket, Archive, Settings, Users, Globe } from 'lucide-react'

interface Tab {
  label: string
  path: string
  feature: string | null
  icon: React.ReactNode
}

interface TabsProps {
  uuid: string
  features?: string[]
}

const tabs: Tab[] = [
  { label: 'Console',  path: '',         feature: null,      icon: <Terminal className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Files',    path: '/files',   feature: null,      icon: <Folder className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Players',  path: '/players', feature: 'players', icon: <Users className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Worlds',   path: '/worlds',  feature: 'worlds',  icon: <Globe className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Startup',  path: '/startup', feature: null,      icon: <Rocket className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Backups',  path: '/backups', feature: null,      icon: <Archive className="size-5 mb-0.5 inline-flex mr-1" /> },
  { label: 'Settings', path: '/settings', feature: null,     icon: <Settings className="size-5 mb-0.5 inline-flex mr-1" /> },
]

export default function ServerTabs({ uuid, features = [] }: TabsProps) {
  const pathname = usePathname() ?? ''
  const mobileStripRef = useRef<HTMLDivElement>(null)
  const base = `/server/${uuid}`

  const visibleTabs = tabs.filter(t => {
    if (t.feature && !features.includes(t.feature)) return false
    return true
  })

  useEffect(() => {
    const strip = mobileStripRef.current
    if (!strip) return
    const active = strip.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return
    strip.scrollLeft = active.offsetLeft - strip.offsetWidth / 2 + active.offsetWidth / 2
  }, [pathname])

  return (
    <>
      {/* ── Mobile: scrollable compact strip ── */}
      <div ref={mobileStripRef} className="sm:hidden overflow-x-auto border-b border-neutral-200 dark:border-white/5 mb-4">
        <nav className="flex gap-1 min-w-max pb-1">
          {visibleTabs.map(tab => {
            const href = `${base}${tab.path}`
            const active = tab.path === ''
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(href)
            return (
              <Link
                key={tab.label}
                href={href}
                className={`nav-link2 px-3 py-2 text-xs font-medium rounded-lg border whitespace-nowrap transition ${
                  active
                    ? 'bg-neutral-100 dark:bg-white/10 border-neutral-200 dark:border-neutral-700/30 text-neutral-900 dark:text-white font-medium'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white'
                }`}
                data-active={active ? 'true' : 'false'}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Desktop: icon + label tabs ── */}
      <div className="hidden sm:block mt-4 mb-4 px-4 lg:px-8">
        <nav className="flex">
          <ul role="list" className="flex min-w-full mt-1.5 flex-none gap-x-2 text-sm font-normal leading-6 text-neutral-600 dark:text-neutral-400">
            {visibleTabs.map(tab => {
              const href = `${base}${tab.path}`
              const active = tab.path === ''
                ? pathname === base || pathname === `${base}/`
                : pathname.startsWith(href)
              return (
                <li key={tab.label} className="transition flex-shrink-0">
                  <Link
                    href={href}
                    className="nav-link2 py-2 px-3 transition border hover:bg-neutral-100 dark:hover:bg-white/5 border-transparent hover:text-neutral-900 dark:hover:text-white hover:shadow rounded-xl"
                    data-active={active ? 'true' : 'false'}
                  >
                    {tab.icon}
                    {tab.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}
