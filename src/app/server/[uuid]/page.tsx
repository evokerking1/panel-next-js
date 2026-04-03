'use client'

import { useState, useEffect, useRef, use, useCallback } from 'react'
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
  Queued: boolean
  dockerImage?: string
  node: { name: string; address: string; port: number }
  image: { name: string; stop?: string }
}

interface StatsCardProps {
  title: string
  value: string
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

function extractConsoleText(raw: string): string {
  try {
    const data = JSON.parse(raw)
    return (
      data.line ??
      data.output ??
      data.args?.[0]?.line ??
      data.args?.[0]?.message ??
      (typeof data.args?.[0] === 'string' ? data.args[0] : null) ??
      data.data?.line ??
      data.data?.message ??
      (typeof data.data === 'string' ? data.data : null) ??
      data.message ??
      ''
    )
  } catch {
    return raw
  }
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
  const [consoleConnected, setConsoleConnected] = useState(false)
  const [terminalReady, setTerminalReady] = useState(false)
  const [inputPlaceholder, setInputPlaceholder] = useState('Waiting for container...')
  const daemonFailCount = useRef(0)
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

    let term: import('@xterm/xterm').Terminal | null = null
    let cleanup: (() => void) | null = null

    Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
    ]).then(([{ Terminal }, { FitAddon }]) => {
      if (!termContainerRef.current) return

      term = new Terminal({
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
      setTerminalReady(true)
      for (const line of pendingConsoleLinesRef.current) {
        term.write(line)
      }
      pendingConsoleLinesRef.current = []

      const onResize = () => fitAddon.fit()
      window.addEventListener('resize', onResize)

      const termEl = termContainerRef.current
      let touchStartY = 0

      const handleWheel = (e: WheelEvent) => {
        if (!term) return
        e.preventDefault()
        e.stopPropagation()
        const lines = e.deltaMode === 1 ? e.deltaY : Math.round(e.deltaY / 20)
        term.scrollLines(lines)
      }

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? 0
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (!term) return
        const nextY = e.touches[0]?.clientY ?? touchStartY
        const dy = touchStartY - nextY
        touchStartY = nextY
        e.preventDefault()
        e.stopPropagation()
        term.scrollLines(Math.round(dy / 16))
      }

      termEl?.addEventListener('wheel', handleWheel, { passive: false })
      termEl?.addEventListener('touchstart', handleTouchStart, { passive: true })
      termEl?.addEventListener('touchmove', handleTouchMove, { passive: false })

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        termEl?.removeEventListener('wheel', handleWheel)
        termEl?.removeEventListener('touchstart', handleTouchStart)
        termEl?.removeEventListener('touchmove', handleTouchMove)
        term?.dispose()
        termRef.current = null
        setTerminalReady(false)
      }
    })

    return () => { cleanup?.() }
  }, [])

  const pollStats = useCallback(() => {
    fetch(`/api/server/${uuid}/stats`)
      .then(r => r.json())
      .then(d => {
        daemonFailCount.current = 0
        setDaemonOffline(false)
        setStatus(d.running ? 'running' : 'stopped')
        if (d.running) {
          setInputPlaceholder(consoleConnected ? 'Type a command and press Enter...' : 'Waiting for console...')
        } else {
          setInputPlaceholder('Server is offline')
        }
        if (d.running && d.uptime != null) {
          setUptime(formatUptime(d.uptime))
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
        if (data.data) {
          const stats = data.data
          if (stats.running === false) {
            setStatus('stopped')
            setUptime('')
            return
          }
          if (stats.running === true) {
            setStatus('running')
          }
          if (stats.memory || stats.cpu) {
            setRamPct(stats.memory?.percentage ?? '0')
            setCpuPct(stats.cpu?.percentage ?? '0')
            const bytes = stats.memory?.usage ?? 0
            const mb = bytes / (1024 * 1024)
            setRamUsed(mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`)
            if (stats.uptime != null) setUptime(formatUptime(stats.uptime))
          }
        } else if (data.event === 'state') {
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
  }, [uuid, server, pollStats])

  useEffect(() => {
    if (!server) return
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    let reconnectAttempts = 0
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByCleanup = false

    const scheduleReconnect = () => {
      if (closedByCleanup || reconnectTimer) return
      reconnectAttempts += 1
      const backoff = Math.min(30000, 2000 * Math.pow(1.5, reconnectAttempts - 1))
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, backoff)
    }

    const connect = () => {
      if (closedByCleanup) return
      const ws = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/console`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
        setConsoleConnected(true)
        setDaemonOffline(false)
        setInputPlaceholder(status === 'running' ? 'Type a command and press Enter...' : 'Waiting for container...')
      }

      ws.onmessage = async e => {
        const raw = await readWsText(e.data)
        if (!raw || isDaemonInfraError(raw)) return
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
        const text = extractConsoleText(raw)
        if (!text) return
        writeConsoleLine(text === raw ? maskPrompts(text) : `${maskPrompts(text)}\r\n`)
      }

      ws.onerror = () => {
        setConsoleConnected(false)
        setInputPlaceholder('Waiting for console...')
      }

      ws.onclose = () => {
        setConsoleConnected(false)
        setInputPlaceholder('Waiting for console...')
        if (wsRef.current === ws) {
          wsRef.current = null
        }
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      closedByCleanup = true
      setConsoleConnected(false)
      setInputPlaceholder('Waiting for container...')
      if (reconnectTimer) clearTimeout(reconnectTimer)
      try { wsRef.current?.close() } catch {}
      wsRef.current = null
    }
  }, [uuid, server, status, writeConsoleLine])

  useEffect(() => {
    if (!server) return

    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const lifecycleWs = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/events`)
    lifecycleWs.binaryType = 'arraybuffer'

    lifecycleWs.onmessage = async e => {
      const raw = await readWsText(e.data)
      if (!raw) return

      try {
        const parsed = JSON.parse(raw)
        if (parsed.event !== 'lifecycle') return
        const eventType = String(parsed.data?.type ?? '')
        const message = String(parsed.data?.message ?? '')
        if (message) {
          writeConsoleLine(`\x1b[34m[daemon] \x1b[37m${message}\x1b[0m\r\n`)
        }

        if (eventType === 'pulling' || eventType === 'creating' || eventType === 'starting') {
          setInputPlaceholder('Waiting...')
        }
        if (eventType === 'started') {
          setInputPlaceholder(consoleConnected ? 'Type a command and press Enter...' : 'Waiting for console...')
        }
        if (eventType === 'stopped' || eventType === 'killed') {
          setInputPlaceholder('Server is offline')
        }
        if (eventType === 'error') {
          showToast(message || 'Daemon error.', 'error')
          setInputPlaceholder(consoleConnected ? 'Type a command and press Enter...' : 'Waiting for console...')
        }
      } catch {}
    }

    return () => {
      lifecycleWs.close()
    }
  }, [uuid, server, consoleConnected, showToast, writeConsoleLine])

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
      <InstallBanner uuid={uuid} installing={server.Installing || server.Queued} />

      <FadeUp delay={0.08}>
      <div className="flex flex-col lg:flex-row px-4 sm:px-8 mt-4 gap-5 pb-8">
        <div className="w-full lg:w-2/3 flex flex-col min-w-0">
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 shadow-lg flex-1 console-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border-b border-neutral-800 shrink-0">
              <span className="text-[11px] font-medium text-neutral-600 select-none tracking-wide">console</span>
            </div>
            <div className="bg-[#141414] flex-1 relative">
              <div id="terminal" ref={termContainerRef} />
            </div>
          </div>
          <div className="relative">
            <div className="relative">
              <input ref={inputRef} type="text" value={command}
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
            {!terminalReady && (
              <div className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700/50 rounded-b-xl">
                Initializing console...
              </div>
            )}
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
