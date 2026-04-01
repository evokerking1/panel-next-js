'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PanelLayout from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface ApiKey {
  id: number
  name: string
  key: string
  permissions: string
  active: boolean
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  category: string
  body?: Record<string, string>
}

const endpoints: Endpoint[] = [
  // Servers
  { method: 'GET',  path: '/api/v1/servers',          description: 'List all servers',            category: 'Servers' },
  { method: 'GET',  path: '/api/v1/servers/:uuid',     description: 'Get server details',          category: 'Servers' },
  { method: 'POST', path: '/api/v1/servers',           description: 'Create a server',             category: 'Servers', body: { name: 'string', nodeId: 'number', imageId: 'number', Memory: 'number', Cpu: 'number', Storage: 'number' } },
  { method: 'DELETE', path: '/api/v1/servers/:uuid',   description: 'Delete a server',             category: 'Servers' },
  // Users
  { method: 'GET',  path: '/api/v1/users',             description: 'List all users',              category: 'Users' },
  { method: 'GET',  path: '/api/v1/users/:id',         description: 'Get user details',            category: 'Users' },
  { method: 'POST', path: '/api/v1/users',             description: 'Create a user',               category: 'Users', body: { username: 'string', email: 'string', password: 'string' } },
  { method: 'DELETE', path: '/api/v1/users/:id',       description: 'Delete a user',               category: 'Users' },
  // Nodes
  { method: 'GET',  path: '/api/v1/nodes',             description: 'List all nodes',              category: 'Nodes' },
  { method: 'GET',  path: '/api/v1/nodes/:id',         description: 'Get node details',            category: 'Nodes' },
  // Images
  { method: 'GET',  path: '/api/v1/images',            description: 'List installed images',       category: 'Images' },
]

const methodColors: Record<string, string> = {
  GET:    'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  POST:   'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  PUT:    'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  PATCH:  'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  DELETE: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
}

export default function ApiDocsPage() {
  useAuth({ require: true, adminOnly: true })

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/apikeys')
      .then(r => r.json())
      .then(d => setApiKeys((d.keys || []).filter((k: ApiKey) => k.active)))
      .catch(() => {})
  }, [])

  async function testEndpoint(ep: Endpoint) {
    const key = ep.path
    setLoading(prev => ({ ...prev, [key]: true }))
    setResponses(prev => ({ ...prev, [key]: '' }))

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (selectedKey) headers['x-api-key'] = selectedKey

      const res = await fetch(ep.path.replace(':uuid', 'EXAMPLE_UUID').replace(':id', '1'), {
        method: ep.method,
        headers,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })
      const text = await res.text()
      let formatted = text
      try { formatted = JSON.stringify(JSON.parse(text), null, 2) } catch {}
      setResponses(prev => ({ ...prev, [key]: `HTTP ${res.status}\n\n${formatted}` }))
    } catch (err) {
      setResponses(prev => ({ ...prev, [key]: `Error: ${err}` }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const categories = [...new Set(endpoints.map(e => e.category))]

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="px-2 sm:px-8 pt-4 pb-8 max-w-4xl">

          <FadeUp>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-base font-medium text-neutral-800 dark:text-white">API Documentation</h1>
                <p className="text-sm text-neutral-500 mt-0.5">Comprehensive documentation for the Airlink API</p>
              </div>
              <Link href="/admin/apikeys"
                className="shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition">
                API Keys
              </Link>
            </div>
          </FadeUp>

          {/* Key selector */}
          <FadeUp delay={0.04}>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-4 mb-6">
              <p className="text-sm font-medium text-neutral-700 dark:text-white mb-3">Select API Key for Testing</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedKey}
                  onChange={e => setSelectedKey(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-800 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                >
                  <option value="">Select a key…</option>
                  {apiKeys.map(k => (
                    <option key={k.id} value={k.key}>{k.name}</option>
                  ))}
                </select>
                {selectedKey && (
                  <button onClick={() => setSelectedKey('')}
                    className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 transition">
                    Clear
                  </button>
                )}
              </div>
              {!selectedKey && (
                <p className="text-xs text-neutral-400 mt-2">Select a key to test endpoints directly from this page.</p>
              )}
            </div>
          </FadeUp>

          {/* Base URL */}
          <FadeUp delay={0.06}>
            <div className="rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-900 dark:bg-black/40 px-4 py-3 mb-6 flex items-center gap-3">
              <span className="text-xs text-neutral-400 shrink-0">Base URL</span>
              <code className="text-sm text-emerald-400 font-mono">{typeof window !== 'undefined' ? window.location.origin : 'https://your-panel.com'}</code>
            </div>
          </FadeUp>

          {/* Auth note */}
          <FadeUp delay={0.08}>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 mb-8">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Authentication</p>
              <p className="text-xs text-blue-600 dark:text-blue-400/80">Include your API key in every request using the <code className="font-mono">x-api-key</code> header.</p>
              <code className="block mt-2 text-xs font-mono bg-blue-100 dark:bg-blue-500/10 rounded-lg px-3 py-2 text-blue-700 dark:text-blue-300">
                x-api-key: your-api-key-here
              </code>
            </div>
          </FadeUp>

          {/* Endpoints by category */}
          <div className="space-y-8">
            {categories.map((cat, ci) => (
              <FadeUp key={cat} delay={0.1 + ci * 0.04}>
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">{cat}</h2>
                  <div className="space-y-2">
                    {endpoints.filter(e => e.category === cat).map(ep => {
                      const key = ep.path
                      const isOpen = expanded === key
                      return (
                        <div key={key} className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
                          <button
                            onClick={() => setExpanded(isOpen ? null : key)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition text-left"
                          >
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0 w-16 justify-center ${methodColors[ep.method]}`}>
                              {ep.method}
                            </span>
                            <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300 flex-1 min-w-0 truncate">{ep.path}</code>
                            <span className="text-xs text-neutral-400 hidden sm:block">{ep.description}</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                              className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="border-t border-neutral-200 dark:border-white/5 px-4 py-4 bg-neutral-50/50 dark:bg-white/[0.02]">
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{ep.description}</p>

                              {ep.body && (
                                <div className="mb-4">
                                  <p className="text-xs font-medium text-neutral-500 mb-2">Request body</p>
                                  <div className="rounded-lg bg-neutral-900 dark:bg-black/40 px-4 py-3">
                                    <pre className="text-xs font-mono text-neutral-300">
                                      {JSON.stringify(ep.body, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mb-3">
                                <button
                                  onClick={() => testEndpoint(ep)}
                                  disabled={loading[key]}
                                  className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-50 transition"
                                >
                                  {loading[key] ? 'Sending…' : 'Send request'}
                                </button>
                                {!selectedKey && (
                                  <span className="text-xs text-neutral-400">Select a key above to test</span>
                                )}
                              </div>

                              {responses[key] && (
                                <div className="rounded-lg bg-neutral-900 dark:bg-black/40 px-4 py-3">
                                  <pre className="text-xs font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all">
                                    {responses[key]}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              </FadeUp>
            ))}
          </div>

        </div>
      </div>
    </PanelLayout>
  )
}
