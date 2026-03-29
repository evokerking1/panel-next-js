'use client'

import { useState, useEffect, useRef, use, useCallback } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/layout/PanelLayout'

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
    <div className="stats-card overflow-hidden bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm flex-1"
      style={{ '--i': index } as React.CSSProperties}>
      <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}:</h2>
      <p className="mt-1 text-lg font-medium tracking-tight text-neutral-800 dark:text-white">{value}</p>
    </div>
  )
}

function ConsoleLine({ line }: { line: string }) {
  const isError = /ERROR|WARN/i.test(line)
  const isCmd = line.startsWith('> ')
  return (
    <div className={isError ? 'text-amber-400' : isCmd ? 'text-emerald-400' : 'text-neutral-300'}>
      {line}
    </div>
  )
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
  const [logs, setLogs] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const pollStats = useCallback(() => {
    fetch(`/api/server/${uuid}/stats`)
      .then(r => r.json())
      .then(d => {
        setStatus(d.running ? 'running' : 'stopped')
        if (d.stats) {
          setRamPct(d.stats.ramPct)
          setCpuPct(d.stats.cpuPct)
          setRamUsed(d.stats.ramUsed)
        }
      })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    pollStats()
    pollingRef.current = setInterval(pollStats, 5000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [pollStats])

  useEffect(() => {
    if (!server) return
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${wsProto}//${location.host}/api/server/${uuid}/console`)
    wsRef.current = ws
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data)
        if (data.line) setLogs(prev => [...prev.slice(-500), data.line])
      } catch {
        setLogs(prev => [...prev.slice(-500), e.data])
      }
    }
    ws.onerror = () => {}
    return () => { ws.close() }
  }, [uuid, server])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

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
    setLogs(prev => [...prev, `> ${cmd}`])
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
          <svg className="animate-spin h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </PanelLayout>
    )
  }

  const btnBase = 'rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5'

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 pt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <ServerHeader name={server.name} description={server.description} status={status} />
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{server.image.name}</span>
              <span className="text-neutral-300 dark:text-neutral-600 text-[11px]">·</span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{server.node.name}</span>
              <span className="text-neutral-300 dark:text-neutral-600 text-[11px]">·</span>
              <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">{uuid.split('-')[0]}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => powerAction('start')}
              disabled={status === 'running' || status === 'starting' || server.Suspended || actionLoading}
              className={`${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
              Start
            </button>
            <button onClick={() => powerAction('restart')}
              disabled={status !== 'running' || server.Suspended || actionLoading}
              className={`${btnBase} bg-neutral-800 dark:bg-neutral-600 hover:bg-neutral-700 text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" /></svg>
              Restart
            </button>
            <button onClick={() => powerAction('stop')}
              disabled={status !== 'running' || server.Suspended || actionLoading}
              className={`${btnBase} bg-red-600 hover:bg-red-500 text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>
              Stop
            </button>
          </div>
        </div>
      </div>

      <ServerTabs uuid={uuid} />

      <div className="flex flex-col lg:flex-row px-4 sm:px-8 mt-4 gap-5 pb-8">
        <div className="w-full lg:w-2/3 flex flex-col min-w-0">
          <div className="flex flex-col rounded-xl overflow-hidden border border-neutral-800 shadow-lg flex-1 console-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border-b border-neutral-800 shrink-0">
              <span className="text-[11px] font-medium text-neutral-600 select-none tracking-wide">console</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-[1.6]"
              style={{ background: '#141414', minHeight: 420 }}>
              {logs.length === 0
                ? <p className="text-neutral-600 italic">Server is {status}. Output will appear here.</p>
                : logs.map((line, i) => <ConsoleLine key={i} line={line} />)}
              <div ref={logsEndRef} />
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
          <div className="stats-card bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/30 rounded-xl px-4 py-4 shadow-sm" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Address:</h2>
                <p className="mt-1 text-sm font-medium font-mono tracking-tight text-neutral-800 dark:text-white break-all">{serverIP}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(serverIP); showToast('Copied!', 'success') }}
                className="shrink-0 mt-1 rounded-lg p-1.5 bg-neutral-100 dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600/50 transition-colors" title="Copy">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-neutral-500">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
          <StatsCard title="Status" value={status.charAt(0).toUpperCase() + status.slice(1)} index={1} />
          <StatsCard title="RAM" value={`${ramPct}% — ${ramUsed} / ${server.Memory} MB`} index={2} />
          <StatsCard title="CPU" value={`${cpuPct}%`} index={3} />
          <StatsCard title="Disk Limit" value={`${server.Storage} GB`} index={4} />
        </div>
      </div>
    </PanelLayout>
  )
}
