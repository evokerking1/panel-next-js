'use client'

import { useState, useEffect, use, useCallback } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface Player { name: string; uuid: string }

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
  node: { name: string; address: string; port: number }
  image: { name: string }
}

export default function PlayersPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })

  const [server, setServer] = useState<ServerInfo | null>(null)
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [players, setPlayers] = useState<Player[]>([])
  const [serverInfo, setServerInfo] = useState<{ onlinePlayers: number; maxPlayers: number; version: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(30)

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`/api/server/${uuid}/players`)
      const d = await res.json()
      if (d.players) setPlayers(d.players)
      if (d.serverInfo) setServerInfo(d.serverInfo)
      setStatus(d.online ? 'running' : 'stopped')
    } catch {
      setStatus('unknown')
    }
    setCountdown(30)
  }, [uuid])

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
      .finally(() => setLoading(false))
  }, [uuid])

  useEffect(() => {
    fetchPlayers()
    const interval = setInterval(fetchPlayers, 30000)
    return () => clearInterval(interval)
  }, [fetchPlayers])

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  if (loading || !server) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="mb-4">
          <ServerHeader name={server.name} description={server.description} status={status} />
        </div>
        <ServerTabs uuid={uuid} />

        <div className="mt-6">
          <div className="bg-neutral-100 dark:bg-neutral-800/50 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-neutral-800 dark:text-white mb-1">Players</h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  {serverInfo ? (
                    <>
                      <span className="font-medium">{serverInfo.onlinePlayers}</span>
                      {' / '}
                      <span>{serverInfo.maxPlayers}</span> players online
                      {serverInfo.version && <> · <span className="text-neutral-500">Version: {serverInfo.version}</span></>}
                    </>
                  ) : 'Manage your server\'s player list'}
                </p>
              </div>
            </div>
            <div className="text-xs text-neutral-500 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refreshing in <span className="font-medium mx-1">{countdown}</span> seconds ·
              <button onClick={fetchPlayers} className="ml-1 text-blue-400 hover:text-blue-300 transition-colors">
                Refresh now
              </button>
            </div>
          </div>

          {players.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map(player => (
                <div key={player.uuid} className="relative p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-lg group hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50 transition-all duration-200">
                  <div className="flex items-center">
                    <img
                      src={`https://crafatar.com/avatars/${player.uuid}?size=64&overlay`}
                      alt={`${player.name}'s avatar`}
                      className="rounded-lg border border-neutral-300 dark:border-neutral-700 mr-4 shrink-0"
                      width={64}
                      height={64}
                    />
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
          ) : (
            <div className="bg-neutral-100 dark:bg-neutral-800/30 rounded-xl p-8 text-center">
              {status === 'stopped' ? (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-700/50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 8.735 8.735m0 0a.374.374 0 1 1 .53.53m-.53-.53.53.53m0 0L21 21" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">Server Offline</h2>
                  <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">Start your server to see online players.</p>
                  <button onClick={fetchPlayers} className="mt-6 px-4 py-2 bg-neutral-800 dark:bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-all duration-200 inline-flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </>
              ) : status === 'running' ? (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-700/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">Server is online</h2>
                  <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">No players are currently connected. Players will appear here when they join.</p>
                  {serverInfo && (
                    <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-6">
                      <span><span className="font-semibold">Version:</span> {serverInfo.version}</span>
                      <span><span className="font-semibold">Capacity:</span> {serverInfo.onlinePlayers}/{serverInfo.maxPlayers}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-yellow-700/20 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">Status Unknown</h2>
                  <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">We couldn't determine if your server is online. It may be starting up or in an unusual state.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </PanelLayout>
  )
}
