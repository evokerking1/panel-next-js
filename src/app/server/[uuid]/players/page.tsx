'use client'

import { useState, useEffect, use, useCallback } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import { useAuth } from '@/hooks/useAuth'
import { useToastContext } from '@/components/layout/PanelLayout'
import { RefreshCw, WifiOff, Users, HelpCircle } from 'lucide-react'

interface Player {
  name: string
  uuid: string
}

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
  Queued: boolean
  node: { name: string; address: string; port: number }
  image: { name: string }
}

export default function PlayersPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerInfo | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [players, setPlayers] = useState<Player[]>([])
  const [serverInfo, setServerInfo] = useState<{ onlinePlayers: number; maxPlayers: number; version: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(30)

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`/api/server/${uuid}/players`)
      const data = await res.json()
      if (data.players) setPlayers(data.players)
      if (data.serverInfo) setServerInfo(data.serverInfo)
      setStatus(data.online ? 'running' : 'stopped')
    } catch {
      setStatus('unknown')
      showToast('Failed to refresh players.', 'error')
    }
    setCountdown(30)
  }, [uuid, showToast])

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
      .finally(() => setLoading(false))
  }, [uuid])

  useEffect(() => {
    void fetchPlayers()
    const interval = setInterval(fetchPlayers, 30000)
    return () => clearInterval(interval)
  }, [fetchPlayers])

  useEffect(() => {
    const interval = setInterval(() => setCountdown(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !server) {
    return (
      <PanelLayout>
        <div className="animate-fade-in-up px-4 py-5 lg:px-8">
          <div className="space-y-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3">
                <div className="skeleton h-4 w-40 mb-2" />
                <div className="skeleton h-3 w-28 mb-3" />
                <div className="skeleton h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8 lg:pt-4">
        <ServerHeader name={server.name} description={server.description} status={status} />
      </div>
      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />

      <div className="animate-fade-in-up px-4 pb-8 lg:px-8">
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-white">Players</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {serverInfo ? (
                  <>
                    {serverInfo.onlinePlayers} / {serverInfo.maxPlayers} online
                    {serverInfo.version ? <> · v{serverInfo.version}</> : null}
                  </>
                ) : 'Manage your server\'s player list'}
              </p>
            </div>
            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              <span><span>{countdown}</span>s</span>
              <button onClick={() => void fetchPlayers()} className="text-blue-500 hover:text-blue-400 transition">now</button>
            </div>
          </div>
        </div>

        {players.length > 0 ? (
          <>
            <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player, index) => (
                <div key={player.uuid} className="animate-fade-in-up relative p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50 transition-all duration-200 active:scale-[0.98] transition-transform" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                  <div className="flex items-center">
                    <img src={`https://crafatar.com/avatars/${player.uuid}?size=64&overlay`} alt={`${player.name}'s Avatar`} className="rounded-lg border border-neutral-700 mr-4" width={64} height={64} />
                    <div>
                      <p className="text-lg font-bold text-neutral-800 dark:text-white">{player.name}</p>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2" />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sm:hidden grid grid-cols-2 gap-3">
              {players.map((player, index) => (
                <div key={player.uuid} className="animate-fade-in-up rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-3 flex items-center gap-3" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                  <img src={`https://crafatar.com/avatars/${player.uuid}?size=40&overlay`} alt={player.name} className="w-10 h-10 rounded-lg border border-neutral-200 dark:border-white/10 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{player.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-neutral-500">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div id="no-players-message" className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-8 text-center">
            {status === 'stopped' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700/50 flex items-center justify-center mx-auto mb-3">
                  <WifiOff className="w-5 h-5 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Server offline</p>
                <p className="text-xs text-neutral-500 mt-1">Start your server to see online players.</p>
                <button onClick={() => void fetchPlayers()} className="mt-4 px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition active:scale-[0.96] transition-transform duration-100">Refresh</button>
              </>
            ) : status === 'running' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-700/20 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No players online</p>
                <p className="text-xs text-neutral-500 mt-1">Players appear here when they join.</p>
                {serverInfo ? <p className="text-xs text-neutral-400 mt-2">v{serverInfo.version} · {serverInfo.onlinePlayers}/{serverInfo.maxPlayers}</p> : null}
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-yellow-700/20 flex items-center justify-center mx-auto mb-3">
                  <HelpCircle className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status unknown</p>
                <p className="text-xs text-neutral-500 mt-1">The server may be starting up.</p>
              </>
            )}
          </div>
        )}
      </div>
    </PanelLayout>
  )
}
