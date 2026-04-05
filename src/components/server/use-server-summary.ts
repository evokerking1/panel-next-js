'use client'

import { useCallback, useEffect, useState } from 'react'

type ServerPageStatus = 'running' | 'stopped' | 'unknown'

interface ServerSummaryResponse<TServer> {
  server?: TServer
  features?: string[]
  installed?: boolean
  failed?: boolean
  serverStatus?: {
    online?: boolean
  }
}

export function useServerSummary<TServer>(uuid: string) {
  const [server, setServer] = useState<TServer | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<ServerPageStatus>('unknown')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/server/${uuid}`)
      const data = await response.json() as ServerSummaryResponse<TServer>

      if (data.server) {
        setServer(data.server)
        setStatus(data.serverStatus?.online ? 'running' : 'stopped')
      }

      setFeatures(data.features ?? [])
      setInstalling(!data.installed && !data.failed)
    } catch {}
    setLoading(false)
  }, [uuid])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { server, setServer, features, installing, status, setStatus, loading, refresh }
}
