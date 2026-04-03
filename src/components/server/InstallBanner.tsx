'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'

interface InstallBannerProps {
  uuid: string
  installing: boolean
}

export default function InstallBanner({ uuid, installing }: InstallBannerProps) {
  const [stateText, setStateText] = useState('Waiting for daemon…')
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!installing) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/api/server/${uuid}/events`)
    wsRef.current = ws

    ws.onmessage = e => {
      try {
        const parsed = JSON.parse(e.data)
        if (parsed.event === 'lifecycle' && parsed.data?.message) {
          setStateText(parsed.data.message)
        }
      } catch {}
    }

    const poll = setInterval(() => {
      fetch(`/api/server/${uuid}/stats`)
        .then(r => r.json())
        .then(d => {
          if (d.running) {
            setDone(true)
            ws.close()
            clearInterval(poll)
            setTimeout(() => window.location.reload(), 1600)
          }
        })
        .catch(() => {})
    }, 3000)

    return () => {
      ws.close()
      clearInterval(poll)
    }
  }, [uuid, installing])

  if (!installing && !done && !failed) return null

  return (
    <div id="installBanner" className="mx-4 sm:mx-8 mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 flex items-center gap-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${done ? 'bg-emerald-50 dark:bg-emerald-500/10' : failed ? 'bg-red-50 dark:bg-red-500/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
        {done ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : failed ? (
          <X className="h-4 w-4 text-red-500" />
        ) : (
          <Loader2 className="h-4 w-4 text-neutral-500 dark:text-neutral-400 animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 shrink-0">
            {done ? 'Installation complete' : failed ? 'Installation failed' : 'Installing server'}
          </p>
          {!done && !failed && (
            <>
              <span className="text-neutral-300 dark:text-neutral-600">·</span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{stateText}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
