'use client'

import { useState, useEffect, useRef } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

type Tab = 'appearance' | 'servers' | 'security'

const inputClass = "rounded-xl border border-neutral-200 dark:border-neutral-600/30 focus:border-neutral-400 dark:focus:border-white/70 focus:ring-1 focus:outline-none text-sm w-full bg-neutral-100 dark:bg-neutral-700/20 px-4 py-2 text-neutral-800 dark:text-white transition-colors"
const numClass = "w-40 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition"

interface Settings {
  title?: string
  logo?: string
  allowRegistration?: boolean
  lightTheme?: string
  darkTheme?: string
  allowUserCreateServer?: boolean
  allowUserDeleteServer?: boolean
  defaultServerLimit?: number
  defaultMaxMemory?: number
  defaultMaxCpu?: number
  defaultMaxStorage?: number
  enforceDaemonHttps?: boolean
  rateLimitEnabled?: boolean
  rateLimitRpm?: number
  loginMaxAttempts?: number
  loginLockoutMinutes?: number
  behindReverseProxy?: boolean
  hashApiKeys?: boolean
  bannedIps?: string
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="w-10 h-5 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900 dark:peer-checked:bg-white" />
    </label>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
        {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
      <h2 className="text-[13px] font-medium text-neutral-800 dark:text-white px-5 py-3.5 bg-neutral-50 dark:bg-white/5 border-b border-neutral-200 dark:border-white/5">{title}</h2>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [tab, setTab] = useState<Tab>('appearance')
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banning, setBanning] = useState(false)
  const [banInput, setBanInput] = useState('')
  const [bannedIps, setBannedIps] = useState<string[]>([])
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || d || {}
        setSettings(s)
        try { setBannedIps(JSON.parse(s.bannedIps || '[]')) } catch { setBannedIps([]) }
      })
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false))
  }, [])

  function set(k: string, v: unknown) {
    setSettings(s => ({ ...s, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const section = tab === 'security' ? 'security' : tab === 'servers' ? 'server-policy' : 'general'
    const res = await fetch(`/api/admin/settings?section=${section}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) {
      showToast('Settings saved.', 'success')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to save.', 'error')
    }
    setSaving(false)
  }

  async function banIp() {
    const ip = banInput.trim()
    if (!ip) return
    setBanning(true)
    const res = await fetch('/api/admin/settings?section=ban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const d = await res.json()
    if (res.ok || d.success) {
      setBannedIps(prev => [...prev.filter(i => i !== ip), ip])
      setBanInput('')
      showToast(`${ip} banned.`, 'success')
    } else {
      showToast(d.error || 'Failed to ban IP.', 'error')
    }
    setBanning(false)
  }

  async function unbanIp(ip: string) {
    const res = await fetch('/api/admin/settings?section=unban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const d = await res.json()
    if (res.ok || d.success) {
      setBannedIps(prev => prev.filter(i => i !== ip))
      showToast(`${ip} unbanned.`, 'success')
    } else {
      showToast(d.error || 'Failed to unban.', 'error')
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'appearance', label: 'Appearance' },
    { key: 'servers', label: 'Servers' },
    { key: 'security', label: 'Security' },
  ]

  return (
    <PanelLayout>
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-8 pt-5">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Settings</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Manage your panel configuration.</p>
        </div>

        <div className="px-8 mt-5">
          <div className="flex gap-0.5 mb-6 border-b border-neutral-200 dark:border-neutral-700/40">
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2 ${
                  tab === t.key
                    ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white'
                    : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'appearance' && (
                <div className="space-y-5 max-w-3xl">
                  <Card title="Branding">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-white mb-2">Site title</label>
                        <input type="text" className={inputClass} value={settings.title || ''} onChange={e => set('title', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-white mb-2">Logo</label>
                        <input ref={logoRef} type="file" name="logo" accept="image/*"
                          className="rounded-xl border border-neutral-200 dark:border-neutral-600/30 text-sm w-full bg-neutral-100 dark:bg-neutral-700/20 px-4 py-2 text-neutral-800 dark:text-white file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-neutral-200 dark:file:bg-neutral-600 file:text-neutral-700 dark:file:text-neutral-300" />
                        {settings.logo && <img src={settings.logo.startsWith('/') ? settings.logo : `/${settings.logo}`} alt="Logo" className="h-8 mt-2 object-contain" />}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-white mb-2">Favicon</label>
                        <input ref={faviconRef} type="file" name="favicon" accept=".ico,.png,.jpg,.jpeg"
                          className="rounded-xl border border-neutral-200 dark:border-neutral-600/30 text-sm w-full bg-neutral-100 dark:bg-neutral-700/20 px-4 py-2 text-neutral-800 dark:text-white file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-neutral-200 dark:file:bg-neutral-600 file:text-neutral-700 dark:file:text-neutral-300" />
                        <p className="text-xs text-neutral-400 mt-1">PNG or JPG auto-converted to .ico</p>
                      </div>
                    </div>
                  </Card>

                  <Card title="Registration">
                    <Row label="Allow public registration" desc="When off, only admins can create new accounts.">
                      <Toggle checked={!!settings.allowRegistration} onChange={v => set('allowRegistration', v)} />
                    </Row>
                  </Card>
                </div>
              )}

              {tab === 'servers' && (
                <div className="space-y-5 max-w-2xl">
                  <Card title="Server Creation">
                    <Row label="Allow user server creation" desc="When enabled, users can create their own servers.">
                      <Toggle checked={!!settings.allowUserCreateServer} onChange={v => set('allowUserCreateServer', v)} />
                    </Row>
                    <Row label="Allow user server deletion" desc="When enabled, users can delete their own servers.">
                      <Toggle checked={!!settings.allowUserDeleteServer} onChange={v => set('allowUserDeleteServer', v)} />
                    </Row>
                  </Card>

                  <Card title="Default Limits">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max servers per user</label>
                        <input type="number" min="0" className={numClass} value={settings.defaultServerLimit ?? 0}
                          onChange={e => set('defaultServerLimit', parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max memory (MB)</label>
                        <input type="number" min="128" className={numClass} value={settings.defaultMaxMemory ?? 512}
                          onChange={e => set('defaultMaxMemory', parseInt(e.target.value) || 512)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max CPU (%)</label>
                        <input type="number" min="10" max="1000" className={numClass} value={settings.defaultMaxCpu ?? 100}
                          onChange={e => set('defaultMaxCpu', parseInt(e.target.value) || 100)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max storage (GB)</label>
                        <input type="number" min="1" className={numClass} value={settings.defaultMaxStorage ?? 5}
                          onChange={e => set('defaultMaxStorage', parseInt(e.target.value) || 5)} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Daemon">
                    <Row label="Enforce HTTPS for daemon" desc="Use HTTPS when communicating with daemon nodes.">
                      <Toggle checked={!!settings.enforceDaemonHttps} onChange={v => set('enforceDaemonHttps', v)} />
                    </Row>
                  </Card>
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-5 max-w-2xl">
                  <Card title="Rate Limiting">
                    <Row label="Enable rate limiting" desc="Block IPs that exceed the request threshold.">
                      <Toggle checked={!!settings.rateLimitEnabled} onChange={v => set('rateLimitEnabled', v)} />
                    </Row>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Requests per minute</label>
                      <input type="number" min="1" max="10000" className={numClass}
                        value={settings.rateLimitRpm ?? 100}
                        onChange={e => set('rateLimitRpm', parseInt(e.target.value) || 100)} />
                    </div>
                  </Card>

                  <Card title="Login Protection">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max login attempts</label>
                        <input type="number" min="1" max="100" className={numClass}
                          value={settings.loginMaxAttempts ?? 5}
                          onChange={e => set('loginMaxAttempts', parseInt(e.target.value) || 5)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Lockout duration (minutes)</label>
                        <input type="number" min="1" max="1440" className={numClass}
                          value={settings.loginLockoutMinutes ?? 15}
                          onChange={e => set('loginLockoutMinutes', parseInt(e.target.value) || 15)} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Advanced">
                    <Row label="Behind reverse proxy" desc="Trust X-Forwarded-For headers for real IP detection.">
                      <Toggle checked={!!settings.behindReverseProxy} onChange={v => set('behindReverseProxy', v)} />
                    </Row>
                    <Row label="Hash API keys" desc="Store API keys as hashes instead of plaintext.">
                      <Toggle checked={!!settings.hashApiKeys} onChange={v => set('hashApiKeys', v)} />
                    </Row>
                  </Card>

                  <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
                    <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
                      <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Banned IPs</h2>
                      <p className="mt-0.5 text-xs text-neutral-500">IPs on this list are blocked from accessing the panel entirely.</p>
                    </div>
                    <div className="px-5 py-5 space-y-4">
                      <div className="flex gap-2">
                        <input type="text" placeholder="e.g. 192.168.1.100" value={banInput}
                          onChange={e => setBanInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && banIp()}
                          className="flex-1 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 transition" />
                        <button onClick={banIp} disabled={banning}
                          className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition whitespace-nowrap disabled:opacity-60">
                          Ban IP
                        </button>
                      </div>

                      {bannedIps.length > 0 ? (
                        <ul className="space-y-1.5">
                          {bannedIps.map(ip => (
                            <li key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-white/5 text-sm">
                              <span className="font-mono text-neutral-700 dark:text-neutral-300 text-xs">{ip}</span>
                              <button onClick={() => unbanIp(ip)} className="text-xs text-red-500 hover:text-red-400 transition">Remove</button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-neutral-400">No IPs are currently banned.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <button onClick={save} disabled={saving}
                      className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition disabled:opacity-60">
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}

              {tab !== 'security' && (
                <div className="mt-6">
                  <button onClick={save} disabled={saving}
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PanelLayout>
  )
}
