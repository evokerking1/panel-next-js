'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface SecuritySettings {
  rateLimitEnabled: boolean
  rateLimitRpm: number
  bannedIps: string
  loginMaxAttempts: number
  loginLockoutMinutes: number
  behindReverseProxy: boolean
  hashApiKeys: boolean
  enforceDaemonHttps: boolean
}

export default function SecurityPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newIp, setNewIp] = useState('')
  const [bannedList, setBannedList] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setSettings(d.settings)
          try { setBannedList(JSON.parse(d.settings.bannedIps || '[]')) } catch { setBannedList([]) }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    const res = await fetch('/api/admin/settings?section=security', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rateLimitEnabled: settings.rateLimitEnabled,
        rateLimitRpm: settings.rateLimitRpm,
        loginMaxAttempts: settings.loginMaxAttempts,
        loginLockoutMinutes: settings.loginLockoutMinutes,
        behindReverseProxy: settings.behindReverseProxy,
        hashApiKeys: settings.hashApiKeys,
        enforceDaemonHttps: settings.enforceDaemonHttps,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Security settings saved.', 'success')
    } else {
      showToast(d.error || 'Failed to save.', 'error')
    }
    setSaving(false)
  }

  async function banIp() {
    const ip = newIp.trim()
    if (!ip || bannedList.includes(ip)) return
    const res = await fetch('/api/admin/settings?section=ban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    if (res.ok) {
      setBannedList(prev => [...prev, ip])
      setNewIp('')
      showToast(`${ip} banned.`, 'success')
    } else {
      showToast('Failed to ban IP.', 'error')
    }
  }

  async function unbanIp(ip: string) {
    const res = await fetch('/api/admin/settings?section=unban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    if (res.ok) {
      setBannedList(prev => prev.filter(b => b !== ip))
      showToast(`${ip} unbanned.`, 'success')
    } else {
      showToast('Failed to unban IP.', 'error')
    }
  }

  function toggle(key: keyof SecuritySettings) {
    setSettings(s => s ? { ...s, [key]: !s[key] } : s)
  }

  const inputClass = 'w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition'

  if (loading) return (
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
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Security</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Rate limiting, IP bans, and login protection.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Rate Limiting</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Limit how many API requests a single IP can make per minute.</p>
            </div>
            <form onSubmit={saveSettings} className="px-5 py-5 space-y-5">
              {[
                { key: 'rateLimitEnabled' as const, label: 'Enable rate limiting', sub: 'Block IPs that exceed the request threshold.' },
                { key: 'behindReverseProxy' as const, label: 'Behind reverse proxy', sub: 'Read real IP from X-Forwarded-For header.' },
                { key: 'hashApiKeys' as const, label: 'Hash API keys', sub: 'Store API keys as hashes for extra security.' },
                { key: 'enforceDaemonHttps' as const, label: 'Enforce daemon HTTPS', sub: 'Force all daemon connections over HTTPS.' },
              ].map(({ key, label, sub }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>
                  </div>
                  <button type="button" onClick={() => toggle(key)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${settings?.[key] ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-neutral-900 rounded-full shadow transition-transform ${settings?.[key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-neutral-200 dark:border-white/5">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Requests per minute</label>
                  <input type="number" min="1" max="10000"
                    value={settings?.rateLimitRpm ?? 100}
                    onChange={e => setSettings(s => s ? { ...s, rateLimitRpm: parseInt(e.target.value) } : s)}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Max login attempts</label>
                  <input type="number" min="1" max="100"
                    value={settings?.loginMaxAttempts ?? 5}
                    onChange={e => setSettings(s => s ? { ...s, loginMaxAttempts: parseInt(e.target.value) } : s)}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Lockout (minutes)</label>
                  <input type="number" min="1" max="1440"
                    value={settings?.loginLockoutMinutes ?? 15}
                    onChange={e => setSettings(s => s ? { ...s, loginLockoutMinutes: parseInt(e.target.value) } : s)}
                    className={inputClass} />
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Banned IPs</h2>
              <p className="mt-0.5 text-xs text-neutral-500">IPs on this list are blocked from accessing the panel.</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="e.g. 192.168.1.100"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); banIp() } }}
                  className={inputClass} />
                <button type="button" onClick={banIp}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition whitespace-nowrap">
                  Ban IP
                </button>
              </div>
              {bannedList.length === 0 ? (
                <p className="text-xs text-neutral-400">No IPs are currently banned.</p>
              ) : (
                <ul className="space-y-1.5">
                  {bannedList.map(ip => (
                    <li key={ip} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-white/5">
                      <span className="font-mono text-neutral-700 dark:text-neutral-300 text-xs">{ip}</span>
                      <button onClick={() => unbanIp(ip)} className="text-xs text-red-500 hover:text-red-400 transition">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </PanelLayout>
  )
}
