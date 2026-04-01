'use client'

import { useEffect, useRef, useState } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import Link from 'next/link'

const LEADS = [
  { login: 'thavanish', role: 'Current maintainer' },
  { login: 'privt00',   role: 'Project lead' },
  { login: 'achul123',  role: 'Core developer' },
]

const LINKS = [
  {
    href: 'https://github.com/airlinklabs/panel',
    label: 'GitHub',
    sub: 'Source code',
    icon: 'github',
  },
  {
    href: 'https://discord.gg/ujXyxwwMHc',
    label: 'Discord',
    sub: 'Community & support',
    icon: 'discord',
  },
  {
    href: 'https://airlinklabs.github.io/home/',
    label: 'Website',
    sub: 'airlinklabs.github.io',
    icon: 'web',
  },
  {
    href: 'https://airlinklabs.github.io/home/docs/quickstart/',
    label: 'Docs',
    sub: 'Documentation',
    icon: 'docs',
  },
]

interface Contributor {
  login: string
  avatar_url: string
  html_url: string
  contributions: number
  type: string
}

const CACHE_KEY = 'airlink_contributors_v2'
const CACHE_TTL = 6 * 60 * 60 * 1000

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  )
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

// The -_- scrolling canvas background — faithful port from express panel
function CreditsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const TILE    = '-_-  '
    const ANGLE   = -12 * Math.PI / 180
    const SPEED   = 28
    const FONT_SZ = 17
    const LINE_H  = Math.round(FONT_SZ * 2.6)

    let offset  = 0
    let last: number | null = null
    let raf: number | null  = null
    let running = false

    function isDark() {
      return document.documentElement.classList.contains('dark')
    }

    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function draw(ts: number) {
      if (!running) return
      if (last === null) last = ts
      const dt = (ts - last) / 1000
      last = ts
      offset = (offset + SPEED * dt) % LINE_H

      const W = canvas!.width
      const H = canvas!.height
      const D = Math.sqrt(W * W + H * H)

      ctx!.clearRect(0, 0, W, H)
      ctx!.save()
      ctx!.translate(W / 2, H / 2)
      ctx!.rotate(ANGLE)

      ctx!.font = `${FONT_SZ}px 'General Sans', monospace`
      ctx!.fillStyle = isDark()
        ? 'rgba(255,255,255,0.045)'
        : 'rgba(0,0,0,0.055)'

      const wrapped = offset % LINE_H
      const tileW   = ctx!.measureText(TILE).width
      const tilesPR = Math.ceil((D * 2) / tileW) + 2
      const row     = TILE.repeat(tilesPR)

      const startY = -D - LINE_H + wrapped
      for (let y = startY; y < D + LINE_H; y += LINE_H) {
        ctx!.fillText(row, -D, y)
      }

      ctx!.restore()
      raf = requestAnimationFrame(draw)
    }

    function start() {
      if (running) return
      running = true
      last    = null
      canvas!.style.opacity = '1'
      raf = requestAnimationFrame(draw)
    }

    function stop() {
      running = false
      if (raf) { cancelAnimationFrame(raf); raf = null }
    }

    resize()
    window.addEventListener('resize', resize)
    setTimeout(start, 80)

    // Sync with theme changes
    function onTheme() {
      // just let the next draw pick up the new colour
    }
    window.addEventListener('theme-changed', onTheme)

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('theme-changed', onTheme)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="credits-canvas fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0, transition: 'opacity 0.8s ease' }}
      aria-hidden="true"
    />
  )
}

function CacheLabel({ ts }: { ts: number }) {
  const mins = Math.round((Date.now() - ts) / 60000)
  return (
    <span className="text-xs text-neutral-400">
      {mins < 2 ? 'Just updated' : `Updated ${mins}m ago`}
    </span>
  )
}

export default function CreditsPage() {
  useAuth({ require: true })

  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loadingContribs, setLoadingContribs] = useState(true)
  const [cacheTs, setCacheTs] = useState<number | null>(null)

  useEffect(() => {
    // Try cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setContributors(parsed.data)
          setCacheTs(parsed.ts)
          setLoadingContribs(false)
          return
        }
      }
    } catch {}

    fetch('https://api.github.com/repos/airlinklabs/panel/contributors?per_page=100')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Contributor[]) => {
        const ts = Date.now()
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts, data })) } catch {}
        setContributors(data)
        setCacheTs(ts)
      })
      .catch(() => {})
      .finally(() => setLoadingContribs(false))
  }, [])

  const nonLeadContribs = contributors.filter(
    c => !LEADS.some(l => l.login === c.login) && c.type !== 'Bot'
  )

  return (
    <PanelLayout>
      <CreditsCanvas />

      <div className="relative z-10 px-4 sm:px-8 md:px-12 pt-6 pb-12 space-y-8 max-w-2xl">

        <FadeUp>
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Credits</h1>
            <p className="text-sm text-neutral-500 mt-0.5">The people who build and maintain Airlink.</p>
          </div>
        </FadeUp>

        {/* Project leads */}
        <FadeUp delay={0.05}>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              Project leads
            </h2>
            <div className="space-y-2">
              {LEADS.map(lead => (
                <div
                  key={lead.login}
                  className="flex items-center gap-3 rounded-xl bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none px-4 py-3"
                >
                  <img
                    src={`https://github.com/${lead.login}.png?size=64`}
                    alt={lead.login}
                    className="h-10 w-10 rounded-xl border border-neutral-200 dark:border-white/10 object-cover shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://github.com/ghost.png' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">{lead.login}</p>
                    <p className="text-xs text-neutral-500">{lead.role}</p>
                  </div>
                  <a
                    href={`https://github.com/${lead.login}`}
                    target="_blank"
                    rel="noopener"
                    className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition p-1"
                  >
                    <GitHubIcon className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </section>
        </FadeUp>

        {/* Contributors */}
        <FadeUp delay={0.1}>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Contributors
              </h2>
              {cacheTs && <CacheLabel ts={cacheTs} />}
            </div>

            {loadingContribs ? (
              <div className="flex items-center gap-2 py-2">
                <div className="h-4 w-4 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" />
                <span className="text-sm text-neutral-400">Loading…</span>
              </div>
            ) : nonLeadContribs.length === 0 ? (
              <p className="text-sm text-neutral-400">No other contributors found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {nonLeadContribs.map(c => (
                  <a
                    key={c.login}
                    href={c.html_url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2.5 rounded-xl bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none px-3 py-2.5 min-w-0 hover:bg-neutral-50 dark:hover:bg-white/10 transition"
                  >
                    <img
                      src={`${c.avatar_url}&s=40`}
                      alt={c.login}
                      className="h-7 w-7 rounded-lg border border-neutral-200 dark:border-white/10 object-cover shrink-0"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://github.com/ghost.png' }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-800 dark:text-white truncate">{c.login}</p>
                      <p className="text-[10px] text-neutral-400">
                        {c.contributions} commit{c.contributions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </FadeUp>

        {/* Links */}
        <FadeUp delay={0.15}>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              Links
            </h2>
            <div className="space-y-2">
              {LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center gap-3 rounded-xl bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/10 transition"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-white/5 shrink-0">
                    {link.icon === 'github' && <GitHubIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />}
                    {link.icon === 'discord' && <DiscordIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />}
                    {(link.icon === 'web' || link.icon === 'docs') && <ExternalIcon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white">{link.label}</p>
                    <p className="text-xs text-neutral-500 truncate">{link.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                </a>
              ))}
            </div>
          </section>
        </FadeUp>

        {/* License */}
        <FadeUp delay={0.2}>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              License
            </h2>
            <div className="rounded-xl bg-white/80 dark:bg-white/5 border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none px-4 py-4">
              <p className="text-sm font-medium text-neutral-800 dark:text-white mb-1.5">MIT License</p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Free and open source. Use, modify, and distribute provided the copyright notice is included.
              </p>
              <a
                href="https://github.com/airlinklabs/panel/blob/main/LICENSE"
                target="_blank"
                rel="noopener"
                className="inline-block mt-2 text-xs text-neutral-400 underline hover:text-neutral-600 dark:hover:text-neutral-300 transition"
              >
                View full license
              </a>
            </div>
          </section>
        </FadeUp>

      </div>
    </PanelLayout>
  )
}
