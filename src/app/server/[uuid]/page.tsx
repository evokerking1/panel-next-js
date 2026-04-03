'use client'

import { useState, useEffect, useRef, use, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/layout/PanelLayout'
import { FadeUp } from '@/components/ui/Animate'
import { Play, RotateCcw, Square, Copy, Loader2, Tag, Server, Hash, AlertTriangle } from 'lucide-react'

interface ServerData {
  UUID: string
  name: string
  description?: string
  Memory: number
  Cpu: number
  Storage: number
  Ports: string
  Suspended: boolean
  Installing: boolean
  dockerImage?: string
  node: { name: string; address: string; port: number }
  image: { name: string; stop?: string }
}

interface StatsCardProps {
  title: string
  value: string
  index: number
}

function StatsCard({ title, value, index }: StatsCardProps) {
  return (
    <div className="stats-card overflow-hidden bg-white dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 group flex-1"
      style={{ '--i': index } as React.CSSProperties}>
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}:</h2>
      <p className="mt-1 text-lg font-medium tracking-tight text-neutral-800 dark:text-white">{value}</p>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function ServerConsolePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerData | null>(null)
  const [status, setStatus] = useState<'running' | 'stopped' | 'starting' | 'stopping'>('stopped')
  const [ramPct, setRamPct] = useState('0')
  const [cpuPct, setCpuPct] = useState('0')
  const [ramUsed, setRamUsed] = useState('0MB')
  const [uptime, setUptime] = useState('')
  const [command, setCommand] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [daemonOffline, setDaemonOffline] = useState(false)
  const daemonFailCount = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const statusWsRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const termContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStatus(d.serverStatus?.online ? 'running' : 'stopped')
        }
      })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    if (!termContainerRef.current) return

    const term = new Terminal({
      disableStdin: true,
      lineHeight: 1.35,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      theme: {
        foreground: '#c5c9d1',
        background: '#141414',
        selectionBackground: '#5DA5D580',
        black: '#1E1E1D',
        brightBlack: '#262625',
        red: '#E54B4B',
        green: '#9ECE58',
        yellow: '#FAED70',
        blue: '#396FE2',
        magenta: '#BB80B3',
        cyan: '#2DDAFD',
        white: '#d0d0d0',
        brightRed: '#FF5370',
        brightGreen: '#C3E88D',
        brightYellow: '#FFCB6B',
        brightBlue: '#82AAFF',
        brightMagenta: '#C792EA',
        brightCyan: '#89DDFF',
        brightWhite: '#ffffff',
        cursor: '#c5c9d1',
        cursorAccent: '#141414',
      },
      scrollback: 1000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termContainerRef.current)
    fitAddon.fit()
    termRef.current = term

    const onResize = () => fitAddon.fit()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
      termRef.current = null
    }
  }, [])

  const pollStats = useCallback(() => {
    fetch(`/api/server/${uuid}/stats`)
      .then(r => r.json())
      .then(d => {
        daemonFailCount.current = 0
        setDaemonOffline(false)
        setStatus(d.running ? 'running' : 'stopped')
        if (d.running && d.stats?.uptime != null) {
          setUptime(formatUptime(d.stats.uptime))
        } else {
          setUptime('')
        }
        if (d.stats) {
          setRamPct(d.stats.ramPct)
          setCpuPct(d.stats.cpuPct)
          setRamUsed(d.stats.ramUsed)
        }
      })
      .catch(() => {
        daemonFailCount.current += 1
        if (daemonFailCount.current >= 3) setDaemonOffline(true)
      })
  }, [uuid])

  useEffect(() => {
    if (!server) return

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const statusWs = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/status`)
    statusWsRef.current = statusWs
    let statusWsConnected = false

    statusWs.onopen = () => {
      statusWsConnected = true
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    statusWs.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'state') {
          const running = data.args?.[0] === 'running'
          setStatus(running ? 'running' : 'stopped')
          if (!running) setUptime('')
        } else if (data.event === 'stats') {
          const stats = data.args?.[0]
          if (stats) {
            setRamPct(stats.memory?.percentage ?? '0')
            setCpuPct(stats.cpu?.percentage ?? '0')
            const bytes = stats.memory?.usage ?? 0
            const mb = bytes / (1024 * 1024)
            setRamUsed(mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`)
            if (stats.uptime != null) setUptime(formatUptime(stats.uptime))
          }
        }
      } catch {}
    }

    statusWs.onerror = () => {
      if (!statusWsConnected) {
        pollStats()
        pollingRef.current = setInterval(pollStats, 5000)
      }
    }

    statusWs.onclose = () => {
      if (statusWsConnected && !pollingRef.current) {
        pollStats()
        pollingRef.current = setInterval(pollStats, 5000)
      }
    }

    pollStats()
    pollingRef.current = setInterval(pollStats, 5000)

    return () => {
      statusWs.close()
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [uuid, server, pollStats])

  useEffect(() => {
    if (!server) return
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/console`)
    wsRef.current = ws
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.line) termRef.current?.writeln(data.line)
      } catch {
        termRef.current?.writeln(e.data)
      }
    }
    ws.onerror = () => {}
    return () => { ws.close() }
  }, [uuid, server])

  async function powerAction(action: 'start' | 'stop' | 'restart') {
    setActionLoading(true)
    if (action === 'start') setStatus('starting')
    if (action === 'stop') setStatus('stopping')
    try {
      const res = await fetch(`/api/server/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const d = await res.json()
      if (!res.ok) showToast(d.error || 'Action failed.', 'error')
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setActionLoading(false)
      setTimeout(pollStats, 2000)
    }
  }

  async function sendCommand() {
    const cmd = command.trim()
    if (!cmd || status !== 'running') return
    termRef.current?.writeln(`> ${cmd}`)
    setCommand('')
    inputRef.current?.focus()
    try {
      await fetch(`/api/server/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', command: cmd }),
      })
    } catch {}
  }

  const primaryPort = (() => {
    try {
      const ports = JSON.parse(server?.Ports || '[]')
      return ports.find((p: { primary: boolean; Port: number }) => p.primary)?.Port
    } catch { return undefined }
  })()

  const serverIP = server ? `${server.node.address}:${primaryPort ?? '?'}` : '...'

  if (!server) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-6 w-6 text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  const btnBase = 'rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5'

  return (
    <PanelLayout>
      <FadeUp>
      <div className="px-4 sm:px-8 pt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <ServerHeader name={server.name} description={server.description} status={status} uptime={uptime} />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-neutral-400 shrink-0" />
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{server.image.name}</span>
              </span>
              <span className="text-neutral-300 dark:text-neutral-600 text-[11px]">·</span>
              <span className="flex items-center gap-1.5">
                <Server className="h-3 w-3 text-neutral-400 shrink-0" />
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{server.node.name}</span>
              </span>
              <span className="text-neutral-300 dark:text-neutral-600 text-[11px]">·</span>
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-neutral-400 shrink-0" />
                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">{uuid.split('-')[0]}</span>
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => powerAction('start')}
              disabled={status === 'running' || status === 'starting' || server.Suspended || actionLoading}
              className={`${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white`}>
              <Play className="size-4" />
              Start
            </button>
            <button onClick={() => powerAction('restart')}
              disabled={status !== 'running' || server.Suspended || actionLoading}
              className={`${btnBase} bg-neutral-800 dark:bg-neutral-600 hover:bg-neutral-700 text-white`}>
              <RotateCcw className="size-4" />
              Restart
            </button>
            <button onClick={() => powerAction('stop')}
              disabled={status !== 'running' || server.Suspended || actionLoading}
              className={`${btnBase} bg-red-600 hover:bg-red-500 text-white`}>
              <Square className="size-4" />
              Stop
            </button>
          </div>
        </div>

        {server.Suspended && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-500">Server Suspended</p>
              <p className="text-xs text-red-400">This server has been suspended by an administrator.</p>
            </div>
          </div>
        )}

        {daemonOffline && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-500">Connection Error</p>
              <p className="text-xs text-red-400">The daemon appears to be offline. Server controls are unavailable.</p>
            </div>
            <button onClick={() => window.location.reload()}
              className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition">
              Retry
            </button>
          </div>
        )}
      </div>
      </FadeUp>

      <ServerTabs uuid={uuid} />
      <InstallBanner uuid={uuid} installing={server.Installing} />

      <FadeUp delay={0.08}>
      <div className="flex flex-col lg:flex-row px-4 sm:px-8 mt-4 gap-5 pb-8">
        <div className="w-full lg:w-2/3 flex flex-col min-w-0">
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 shadow-lg flex-1 console-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border-b border-neutral-800 shrink-0">
              <span className="text-[11px] font-medium text-neutral-600 select-none tracking-wide">console</span>
            </div>
            <div className="bg-[#141414] flex-1 relative">
              <div ref={termContainerRef} style={{ height: 420 }} />
            </div>
          </div>
          <div className="relative">
            <input ref={inputRef} type="text" value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendCommand() }}
              disabled={status !== 'running'}
              placeholder={status === 'running' ? 'Type a command and press Enter...' : 'Server is offline'}
              className="w-full px-4 py-3 bg-transparent rounded-b-xl text-sm border-t border-neutral-600/20 focus:ring-1 focus:ring-neutral-500/50 dark:focus:ring-neutral-100/20 focus:border-transparent placeholder:text-neutral-600 dark:placeholder:text-neutral-500 text-neutral-800 dark:text-white outline-none disabled:opacity-50 transition" />
          </div>
        </div>

        <div className="w-full lg:w-1/3 space-y-4 flex flex-col">
          <div className="stats-card bg-white dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 group" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Address:</h2>
                <p className="mt-1 text-sm font-medium font-mono tracking-tight text-neutral-800 dark:text-white break-all">{serverIP}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(serverIP); showToast('Copied!', 'success') }}
                className="shrink-0 mt-1 rounded-lg p-1.5 bg-neutral-100 dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600/50 transition-colors" title="Copy">
                <Copy className="h-3.5 w-3.5 text-neutral-500" />
              </button>
            </div>
          </div>
          <StatsCard title="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} index={1} />
          <StatsCard title="RAM" value={`${ramPct}% — ${ramUsed} / ${server.Memory} MB`} index={2} />
          <StatsCard title="CPU" value={`${cpuPct}%`} index={3} />
          <StatsCard title="Disk Limit" value={`${server.Storage} GB`} index={4} />
        </div>
      </div>
      </FadeUp>
    </PanelLayout>
  )
}
