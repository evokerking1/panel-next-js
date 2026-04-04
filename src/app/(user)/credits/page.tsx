'use client'

import { Github, ExternalLink, ChevronRight , Loader2} from 'lucide-react'

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
  return <Github className={className} />
}

function DiscordIcon({ className }: { className?: string }) {
  return <ExternalLink className={className} />
}

function ExternalIcon({ className }: { className?: string }) {
  return <ExternalLink className={className} />
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

      <div className="panel-page panel-page-shell relative z-10 space-y-8">

        <FadeUp>
          <div className="panel-grid-wide items-start">
            <div className="panel-page-heading">
              <h1 className="panel-page-title">Credits</h1>
              <p className="panel-page-subtitle">The people and links behind Airlink.</p>
            </div>
            <div className="panel-stat-card">
              <p className="panel-stat-label">Project</p>
              <p className="panel-stat-value">Airlink Panel</p>
              <p className="panel-stat-subtle">Open source panel maintained by the Airlink contributors.</p>
            </div>
          </div>
        </FadeUp>

        <div className="panel-grid-wide items-start">
        <div className="panel-stack">
        <FadeUp delay={0.05}>
          <section className="panel-card">
            <div className="panel-card-header">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              Project leads
            </h2>
            </div>
            <div className="panel-card-body space-y-2">
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
            </div>
          </section>
        </FadeUp>

        <FadeUp delay={0.1}>
          <section className="panel-card">
            <div className="panel-card-header flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Contributors
              </h2>
              {cacheTs && <CacheLabel ts={cacheTs} />}
            </div>
            <div className="panel-card-body">

            {loadingContribs ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="animate-spin h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-400">Loading…</span>
              </div>
            ) : nonLeadContribs.length === 0 ? (
              <p className="text-sm text-neutral-400">No other contributors found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            </div>
          </section>
        </FadeUp>
        </div>

        <div className="panel-stack">
        <FadeUp delay={0.15}>
          <section className="panel-card">
            <div className="panel-card-header">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              Links
            </h2>
            </div>
            <div className="panel-card-body space-y-2">
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
            </div>
          </section>
        </FadeUp>

        <FadeUp delay={0.2}>
          <section className="panel-card">
            <div className="panel-card-header">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
              License
            </h2>
            </div>
            <div className="panel-card-body">
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
            </div>
          </section>
        </FadeUp>
        </div>
        </div>

      </div>
    </PanelLayout>
  )
}
