'use client'

import { useEffect, useRef, useState } from 'react'

async function readWsText(data: string | Blob | ArrayBuffer): Promise<string> {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return data.text()
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data)
  return ''
}

function getInstallMessage(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const parsed = payload as {
    line?: unknown
    message?: unknown
    args?: Array<{ line?: unknown }>
    data?: { line?: unknown; message?: unknown }
  }

  return parsed.line
    ?? parsed.args?.[0]?.line
    ?? parsed.data?.line
    ?? parsed.data?.message
    ?? parsed.message
}

export function useInstallStatus(uuid: string, installing: boolean) {
  const [lines, setLines] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [stateText, setStateText] = useState('Waiting for daemon...')
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!installing) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/api/server/${uuid}/events`)

    ws.onmessage = async (event) => {
      const raw = await readWsText(event.data)
      if (!raw) return

      try {
        const line = getInstallMessage(JSON.parse(raw))
        if (line) {
          const text = String(line)
          setStateText(text)
          setLines((prev) => [...prev, text])
          return
        }
      } catch {}

      setStateText(raw)
      setLines((prev) => [...prev, raw])
    }

    const poll = setInterval(() => {
      fetch(`/api/server/${uuid}/stats`)
        .then((response) => response.json())
        .then((data) => {
          if (data.state === 'installed' || data.installed || data.running) {
            setDone(true)
            setFailed(false)
            ws.close()
            clearInterval(poll)
            setTimeout(() => window.location.reload(), 1600)
            return
          }

          if (data.state === 'failed' || data.failed) {
            setFailed(true)
            setDone(false)
            ws.close()
            clearInterval(poll)
          }
        })
        .catch(() => {})
    }, 3000)

    return () => {
      ws.close()
      clearInterval(poll)
    }
  }, [uuid, installing])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return { done, failed, lines, stateText, logEndRef }
}
