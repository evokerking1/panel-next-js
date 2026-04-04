'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/layout/PanelLayout'
import { FadeUp } from '@/components/ui/Animate'
import { Play, RotateCcw, Square, Copy, Loader2, Tag, Server, Hash, AlertTriangle, Check } from 'lucide-react'

const LineChart = dynamic(
  async () => {
    const [{ Line }, chartJs] = await Promise.all([
      import('react-chartjs-2'),
      import('chart.js'),
    ])
    chartJs.Chart.register(
      chartJs.LineElement,
      chartJs.PointElement,
      chartJs.LineController,
      chartJs.CategoryScale,
      chartJs.LinearScale,
      chartJs.Filler,
    )
    return Line
  },
  { ssr: false }
)

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
  Queued: boolean
  dockerImage?: string
  node: { name: string; address: string; port: number }
  image: { name: string; stop?: string }
}

interface StatsCardProps {
  title: string
  value: string
  index: number
  sublabel?: string
}

interface SparklineCardProps {
  title: string
  value: string
  history: number[]
  color: string
  index: number
}

async function readWsText(data: string | Blob | ArrayBuffer): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return data.text()
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data)
  return ''
}

function isDaemonInfraError(text: string): boolean {
  return (
    text.includes('Failed to attach to container') ||
    text.includes('no such container') ||
    text.includes('No such container') ||
    text.includes('container not available') ||
    text.includes('Attach failed') ||
    text.includes('HTTP code 404') ||
    text.includes('HTTP code 500')
  )
}

const ANSI_RE = /\x1b(?:\[[0-9;]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_]|[\u0080-\u009F])/g
const PROMPT_RE = /(?:[a-zA-Z0-9_-]+)@[^\s:#\])\r\n]+(?:[^$#\r\n]*?)[$#]\s*/g

function maskPrompts(raw: string): string {
  const plain = raw.replace(ANSI_RE, '')
  if (!PROMPT_RE.test(plain)) {
    PROMPT_RE.lastIndex = 0
    return raw
  }
  PROMPT_RE.lastIndex = 0

  const stripped = plain.replace(/[\r\n]/g, '').trim()
  const isOnlyPrompt = PROMPT_RE.test(stripped) && stripped.replace(PROMPT_RE, '').trim() === ''
  PROMPT_RE.lastIndex = 0

  if (isOnlyPrompt) return '\r\nairlinkd~ '
  return plain.replace(PROMPT_RE, 'airlinkd~ ')
}

function StatsCard({ title, value, index, sublabel }: StatsCardProps) {
  return (
    <div
      className="stats-card overflow-hidden bg-white dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 flex-1"
      style={{ '--i': index } as CSSProperties}
    >
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}:</h2>
      <p className="mt-1 text-lg font-medium tracking-tight text-neutral-800 dark:text-white">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</p>}
    </div>
  )
}

function SparklineCard({ title, value, history, color, index }: SparklineCardProps) {
  const data = {
    labels: history.map(() => ''),
    datasets: [{
      data: history,
      borderColor: color,
      backgroundColor: color.replace('0.35', '0.08'),
      borderWidth: 1,
      pointRadius: 0,
      fill: true,
      tension: 0.4,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
  }

  return (
    <div
      className="stats-card overflow-hidden relative bg-white dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 flex-1"
      style={{ '--i': index } as CSSProperties}
    >
      <div className="absolute inset-0 pointer-events-none">
        <LineChart data={data} options={options} />
      </div>
      <div className="relative z-10">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}:</h2>
        <p className="mt-1 text-lg font-medium tracking-tight text-neutral-800 dark:text-white">{value}</p>
      </div>
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
  useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerData | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<'running' | 'stopped' | 'starting' | 'stopping'>('stopped')
  const [ramPct, setRamPct] = useState('0')
  const [cpuPct, setCpuPct] = useState('0')
  const [ramUsed, setRamUsed] = useState('0MB')
  const [uptime, setUptime] = useState('')
  const [command, setCommand] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [daemonOffline, setDaemonOffline] = useState(false)
  const [consoleConnected, setConsoleConnected] = useState(false)
  const [terminalReady, setTerminalReady] = useState(false)
  const [ramHistory, setRamHistory] = useState<number[]>([])
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [copied, setCopied] = useState(false)
  const daemonFailCount = useRef(0)
  const consoleConnectedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const statusWsRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const termContainerRef = useRef<HTMLDivElement>(null)
  const pendingConsoleLinesRef = useRef<string[]>([])
  const commandHistoryRef = useRef<string[]>([])
  const currentCommandIndexRef = useRef(-1)

  const writeConsoleLine = useCallback((line: string) => {
    const normalized = String(line ?? '')
    if (!normalized) return

    if (termRef.current) {
      termRef.current.write(normalized)
      return
    }

    pendingConsoleLinesRef.current.push(normalized)
  }, [])

  const applyStats = useCallback((memoryPct: unknown, cpuValue: unknown, memoryUsage: unknown, rawUptime?: unknown) => {
    const nextRamPct = String(memoryPct ?? '0')
    const nextCpuPct = String(cpuValue ?? '0')
    setRamPct(nextRamPct)
    setCpuPct(nextCpuPct)

    const bytes = Number(memoryUsage ?? 0)
    const mb = bytes / (1024 * 1024)
    setRamUsed(mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`)

    const newRam = parseFloat(nextRamPct) || 0
    const newCpu = parseFloat(nextCpuPct) || 0
    setRamHistory(prev => [...prev.slice(-19), newRam])
    setCpuHistory(prev => [...prev.slice(-19), newCpu])

    if (typeof rawUptime === 'number') {
      setUptime(formatUptime(rawUptime))
    }
  }, [])

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStatus(d.serverStatus?.online ? 'running' : 'stopped')
        }
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    if (!termContainerRef.current) return

    let disposed = false
    let term: import('@xterm/xterm').Terminal | null = null
    let termEl: HTMLDivElement | null = termContainerRef.current
    let removeListeners: (() => void) | null = null

    void Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
    ]).then(([xterm, addonFit]) => {
      if (disposed || !termContainerRef.current) return

      term = new xterm.Terminal({
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

      const fitAddon = new addonFit.FitAddon()
      term.loadAddon(fitAddon)
      term.open(termContainerRef.current)
      requestAnimationFrame(() => {
        if (disposed) return
        fitAddon.fit()
        setTerminalReady(true)
      })
      termRef.current = term

      for (const line of pendingConsoleLinesRef.current) {
        term.write(line)
      }
      pendingConsoleLinesRef.current = []

      const onResize = () => fitAddon.fit()
      window.addEventListener('resize', onResize)

      let touchStartY = 0

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const lines = e.deltaMode === 1 ? e.deltaY : Math.round(e.deltaY / 20)
        term?.scrollLines(lines)
      }

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? 0
      }

      const handleTouchMove = (e: TouchEvent) => {
        const nextY = e.touches[0]?.clientY ?? touchStartY
        const dy = touchStartY - nextY
        touchStartY = nextY
        e.preventDefault()
        e.stopPropagation()
        term?.scrollLines(Math.round(dy / 16))
      }

      termEl?.addEventListener('wheel', handleWheel, { passive: false })
      termEl?.addEventListener('touchstart', handleTouchStart, { passive: true })
      termEl?.addEventListener('touchmove', handleTouchMove, { passive: false })

      removeListeners = () => {
        window.removeEventListener('resize', onResize)
        termEl?.removeEventListener('wheel', handleWheel)
        termEl?.removeEventListener('touchstart', handleTouchStart)
        termEl?.removeEventListener('touchmove', handleTouchMove)
      }
    })

    return () => {
      disposed = true
      removeListeners?.()
      term?.dispose()
      termRef.current = null
      setTerminalReady(false)
    }
  }, [])

  const pollStats = useCallback(() => {
    fetch(`/api/server/${uuid}/stats`)
      .then(r => r.json())
      .then(d => {
        daemonFailCount.current = 0
        setDaemonOffline(false)
        setStatus(d.running ? 'running' : 'stopped')
        if (d.running && d.uptime != null) {
          setUptime(formatUptime(d.uptime))
        } else {
          setUptime('')
        }
        if (d.stats) {
          applyStats(d.stats.ramPct, d.stats.cpuPct, d.stats.ramUsedBytes ?? d.stats.memoryUsage ?? 0, d.uptime)
          if (!('ramUsedBytes' in d.stats) && !('memoryUsage' in d.stats)) {
            setRamUsed(d.stats.ramUsed ?? '0MB')
          }
        }
      })
      .catch(() => {
        daemonFailCount.current += 1
        if (daemonFailCount.current >= 3) setDaemonOffline(true)
      })
  }, [applyStats, uuid])

  useEffect(() => {
    if (!server) return

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const statusWs = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/status`)
    statusWs.binaryType = 'arraybuffer'
    statusWsRef.current = statusWs
    let statusWsConnected = false
    let isCleaningUp = false

    statusWs.onopen = () => {
      statusWsConnected = true
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    statusWs.onmessage = async e => {
      const raw = await readWsText(e.data)
      if (!raw) return

      try {
        const data = JSON.parse(raw)
        if (data.event === 'state') {
          const running = data.data?.running === true
          setStatus(running ? 'running' : 'stopped')
          if (!running) setUptime('')
        } else if (data.event === 'stats') {
          const stats = data.data
          if (stats) {
            applyStats(
              stats.memory?.percentage ?? '0',
              stats.cpu?.percentage ?? '0',
              stats.memory?.usage ?? 0,
              stats.uptime,
            )
          }
        }
      } catch {}
    }

    statusWs.onerror = () => {
      if (!statusWsConnected && !pollingRef.current) {
        pollStats()
        pollingRef.current = setInterval(pollStats, 5000)
      }
    }

    statusWs.onclose = () => {
      if (!isCleaningUp && !pollingRef.current) {
        pollStats()
        pollingRef.current = setInterval(pollStats, 5000)
      }
    }

    pollStats()

    return () => {
      isCleaningUp = true
      statusWs.close()
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [uuid, server, pollStats, applyStats])

  useEffect(() => {
    if (!server) return
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    let reconnectAttempts = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByCleanup = false

    const connect = () => {
      if (closedByCleanup) return
      const ws = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/console`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
        setConsoleConnected(true)
        consoleConnectedRef.current = true
        setDaemonOffline(false)
      }

      ws.onmessage = async e => {
        let raw: string
        if (e.data instanceof Blob) {
          raw = await e.data.text()
        } else if (e.data instanceof ArrayBuffer) {
          raw = new TextDecoder().decode(e.data)
        } else {
          raw = String(e.data)
        }

        if (!raw) return
        if (isDaemonInfraError(raw)) return
        if (raw.includes('airlinkd server appears to be down')) {
          setDaemonOffline(true)
          ws.close()
          return
        }
        if (raw.includes('Working on')) {
          termRef.current?.clear()
          ws.close()
          return
        }
        writeConsoleLine(maskPrompts(raw))
      }

      ws.onerror = () => {
        setConsoleConnected(false)
        consoleConnectedRef.current = false
      }

      ws.onclose = () => {
        setConsoleConnected(false)
        consoleConnectedRef.current = false
        if (wsRef.current === ws) wsRef.current = null
        if (!closedByCleanup) {
          reconnectAttempts++
          const backoff = Math.min(30000, 2000 * Math.pow(1.5, reconnectAttempts - 1))
          reconnectTimer = setTimeout(connect, backoff)
        }
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try { wsRef.current?.close() } catch {}
      wsRef.current = null
      setConsoleConnected(false)
      consoleConnectedRef.current = false
    }
  }, [uuid, server, writeConsoleLine])

  useEffect(() => {
    if (!server) return
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/events`)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async e => {
      const raw = await readWsText(e.data)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        if (parsed.event !== 'lifecycle') return
        const eventType = String(parsed.data?.type ?? '')
        const message = String(parsed.data?.message ?? '')
        if (message) writeConsoleLine(`\x1b[34m[daemon] \x1b[37m${message}\x1b[0m\r\n`)
        if (eventType === 'started') {
          if (consoleConnectedRef.current) inputRef.current?.focus()
        }
        if (eventType === 'error') showToast(message || 'Daemon error.', 'error')
      } catch {}
    }

    return () => { ws.close() }
  }, [uuid, server, showToast, writeConsoleLine])

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

  function copyAddress() {
    navigator.clipboard.writeText(serverIP)
    setCopied(true)
    showToast('Copied!', 'success')
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function sendCommand() {
    const cmd = command.trim()
    if (!cmd || status !== 'running' || !consoleConnected) return
    termRef.current?.write(`\u001b[1m\u001b[33m~ \u001b[0m${cmd}\r\n`)
    const history = commandHistoryRef.current
    if (!history.length || history[history.length - 1] !== cmd) {
      if (history.length === 10) history.shift()
      history.push(cmd)
    }
    currentCommandIndexRef.current = history.length
    setCommand('')
    inputRef.current?.focus()
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'CMD', command: cmd }))
        return
      }
    } catch {}

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
    } catch {
      return undefined
    }
  })()

  const serverIP = server ? `${server.node.address}:${primaryPort ?? '?'}` : '...'

  const inputPlaceholder = (() => {
    if (status === 'stopped' || status === 'stopping') return 'Server is offline'
    if (status === 'starting') return 'Server is starting...'
    if (!consoleConnected) return 'Waiting for console...'
    return 'Type a command and press Enter...'
  })()

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
              <button
                onClick={() => powerAction('start')}
                disabled={status === 'running' || status === 'starting' || server.Suspended || actionLoading}
                className={`${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white`}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Start
              </button>
              <button
                onClick={() => powerAction('restart')}
                disabled={status !== 'running' || server.Suspended || actionLoading}
                className={`${btnBase} bg-neutral-800 dark:bg-neutral-600 hover:bg-neutral-700 text-white`}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                Restart
              </button>
              <button
                onClick={() => powerAction('stop')}
                disabled={status !== 'running' || server.Suspended || actionLoading}
                className={`${btnBase} bg-red-600 hover:bg-red-500 text-white`}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
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
              <button
                onClick={() => window.location.reload()}
                className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </FadeUp>

      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />

      <FadeUp delay={0.08}>
        <div className="flex flex-col lg:flex-row px-4 sm:px-8 mt-4 gap-5 pb-8">
          <div className="w-full lg:w-2/3 flex flex-col min-w-0">
            <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 shadow-lg flex-1 console-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border-b border-neutral-800 shrink-0">
                <span className="text-[11px] font-medium text-neutral-600 select-none tracking-wide">console</span>
              </div>
              <div className="bg-[#141414] flex-1 relative">
                {!terminalReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#141414] z-10">
                    <span className="text-xs text-neutral-600">Initialising console...</span>
                  </div>
                )}
                <div id="terminal" ref={termContainerRef} />
              </div>
            </div>
            <div className="relative">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      sendCommand()
                      return
                    }
                    if (e.key === 'ArrowUp') {
                      const nextIndex = currentCommandIndexRef.current > 0 ? currentCommandIndexRef.current - 1 : 0
                      const nextValue = commandHistoryRef.current[nextIndex]
                      if (nextValue !== undefined) {
                        currentCommandIndexRef.current = nextIndex
                        setCommand(nextValue)
                        e.preventDefault()
                      }
                      return
                    }
                    if (e.key === 'ArrowDown') {
                      const history = commandHistoryRef.current
                      const nextIndex = currentCommandIndexRef.current < history.length - 1
                        ? currentCommandIndexRef.current + 1
                        : history.length
                      currentCommandIndexRef.current = nextIndex
                      setCommand(nextIndex < history.length ? history[nextIndex] : '')
                      e.preventDefault()
                    }
                  }}
                  disabled={status !== 'running' || !consoleConnected}
                  placeholder={inputPlaceholder}
                  className="w-full px-4 py-3 bg-transparent text-neutral-800 dark:text-white rounded-b-xl text-sm border-t border-neutral-600/20 focus:ring-1 focus:ring-neutral-500/50 dark:focus:ring-neutral-100/20 focus:border-transparent placeholder:font-medium placeholder:text-neutral-600 dark:placeholder:text-neutral-500 outline-none relative z-[1] disabled:opacity-60"
                />
                <div
                  id="ghost-text-bg"
                  className="absolute inset-0 px-4 py-3 text-sm pointer-events-none rounded-b-xl overflow-hidden bg-neutral-200 dark:bg-neutral-600/20 border-t border-neutral-600/20"
                  style={{ zIndex: 0 }}
                >
                  <span id="ghost-typed" className="invisible">{command}</span>
                  <span id="ghost-suggestion" className="text-neutral-400 dark:text-neutral-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:gap-4">
            <div className="col-span-2 lg:col-span-1 stats-card bg-white dark:bg-neutral-800/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/30" style={{ '--i': 0 } as CSSProperties}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Address:</h2>
                  <p className="mt-1 text-sm font-medium font-mono tracking-tight text-neutral-800 dark:text-white break-all">{serverIP}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="shrink-0 mt-1 rounded-lg p-1.5 bg-neutral-100 dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600/50 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-neutral-500" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              <StatsCard title="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} sublabel={uptime ? `Uptime: ${uptime}` : undefined} index={1} />
              <SparklineCard title="RAM" value={`${ramPct}% — ${ramUsed} / ${server.Memory} MB`} history={ramHistory} color="rgba(96, 165, 250, 0.35)" index={2} />
              <SparklineCard title="CPU" value={`${cpuPct}%`} history={cpuHistory} color="rgba(74, 222, 128, 0.35)" index={3} />
              <StatsCard title="Disk Limit" value={`${server.Storage} GB`} index={4} />
            </div>
          </div>
        </div>
      </FadeUp>
    </PanelLayout>
  )
}
