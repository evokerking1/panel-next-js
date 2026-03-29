'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface Settings {
  title: string
  description: string
  allowRegistration: boolean
  uploadLimit: number
  rateLimitEnabled: boolean
  rateLimitRpm: number
  loginMaxAttempts: number
  loginLockoutMinutes: number
  enforceDaemonHttps: boolean
  behindReverseProxy: boolean
  hashApiKeys: boolean
  allowUserCreateServer: boolean
  allowUserDeleteServer: boolean
  defaultServerLimit: number
  defaultMaxMemory: number
  defaultMaxCpu: number
  defaultMaxStorage: number
  bannedIps: string
  virusTotalApiKey?: string
}

type TabKey = 'general' | 'security' | 'server-policy'

export default function AdminSettingsPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [tab, setTab] = useState<TabKey>('general')
  const [saving, setSaving] = useState(false)
  const [banIpInput, setBanIpInput] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.settings) setSettings(d.settings) }).catch(() => {})
  }, [])

  function update(k: keyof Settings, v: unknown) {
    setSettings(s => s ? { ...s, [k]: v } : s)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    const res = await fetch(`/api/admin/settings?section=${tab}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const d = await res.json()
    if (res.ok) {
      if (d.settings) setSettings(d.settings)
      showToast('Settings saved.', 'success')
    } else {
      showToast(d.error || 'Failed to save.', 'error')
    }
    setSaving(false)
  }

  async function banIp() {
    const ip = banIpInput.trim()
    if (!ip) return
    const res = await fetch('/api/admin/settings?section=ban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    if (res.ok) {
      showToast(`${ip} banned.`, 'success')
      setBanIpInput('')
      fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.settings) setSettings(d.settings) })
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed.', 'error')
    }
  }

  async function unbanIp(ip: string) {
    const res = await fetch('/api/admin/settings?section=unban-ip', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    if (res.ok) {
      showToast(`${ip} unbanned.`, 'success')
      fetch('/api/admin/settings').then(r => r.json()).then(d => { if (d.settings) setSettings(d.settings) })
    }
  }

  const bannedIps: string[] = (() => { try { return JSON.parse(settings?.bannedIps || '[]') } catch { return [] } })()

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'security', label: 'Security' },
    { key: 'server-policy', label: 'Server policy' },
  ]

  if (!settings) return (
    <PanelLayout><div className="flex items-center justify-center h-64"><svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Settings</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Panel configuration</p>
        </div>

        <div className="flex gap-1 mb-6 border-b border-neutral-200 dark:border-white/5">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-w-2xl space-y-5">
          {tab === 'general' && (
            <>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Panel title</label><input className={inputClass} value={settings.title} onChange={e => update('title', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Description</label><input className={inputClass} value={settings.description || ''} onChange={e => update('description', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Upload limit (MB)</label><input className={inputClass} type="number" value={settings.uploadLimit} onChange={e => update('uploadLimit', parseInt(e.target.value))} /></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.allowRegistration} onChange={e => update('allowRegistration', e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Allow registration</p>
                  <p className="text-xs text-neutral-500">New users can create accounts without an invite</p>
                </div>
              </label>
            </>
          )}

          {tab === 'security' && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.rateLimitEnabled} onChange={e => update('rateLimitEnabled', e.target.checked)} className="rounded" />
                <div><p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enable rate limiting</p><p className="text-xs text-neutral-500">Limits requests per minute per IP</p></div>
              </label>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Requests per minute</label><input className={inputClass} type="number" value={settings.rateLimitRpm} onChange={e => update('rateLimitRpm', parseInt(e.target.value))} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Max login attempts</label><input className={inputClass} type="number" value={settings.loginMaxAttempts} onChange={e => update('loginMaxAttempts', parseInt(e.target.value))} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Lockout duration (minutes)</label><input className={inputClass} type="number" value={settings.loginLockoutMinutes} onChange={e => update('loginLockoutMinutes', parseInt(e.target.value))} /></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.enforceDaemonHttps} onChange={e => update('enforceDaemonHttps', e.target.checked)} className="rounded" />
                <div><p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enforce daemon HTTPS</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.behindReverseProxy} onChange={e => update('behindReverseProxy', e.target.checked)} className="rounded" />
                <div><p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Behind reverse proxy</p><p className="text-xs text-neutral-500">Trust X-Forwarded-For headers</p></div>
              </label>
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Banned IPs</p>
                {bannedIps.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {bannedIps.map(ip => (
                      <div key={ip} className="flex items-center gap-2">
                        <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300">{ip}</span>
                        <button onClick={() => unbanIp(ip)} className="text-xs text-red-500 hover:underline">Unban</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input className={inputClass + ' flex-1'} value={banIpInput} onChange={e => setBanIpInput(e.target.value)} placeholder="192.168.1.1" onKeyDown={e => { if (e.key === 'Enter') banIp() }} />
                  <button onClick={banIp} className="px-3 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white transition">Ban</button>
                </div>
              </div>
            </>
          )}

          {tab === 'server-policy' && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.allowUserCreateServer} onChange={e => update('allowUserCreateServer', e.target.checked)} className="rounded" />
                <div><p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Allow users to create servers</p><p className="text-xs text-neutral-500">Within their assigned limits</p></div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.allowUserDeleteServer} onChange={e => update('allowUserDeleteServer', e.target.checked)} className="rounded" />
                <div><p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Allow users to delete servers</p></div>
              </label>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default server limit</label><input className={inputClass} type="number" value={settings.defaultServerLimit} onChange={e => update('defaultServerLimit', parseInt(e.target.value))} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default max memory (MB)</label><input className={inputClass} type="number" value={settings.defaultMaxMemory} onChange={e => update('defaultMaxMemory', parseInt(e.target.value))} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default max CPU (%)</label><input className={inputClass} type="number" value={settings.defaultMaxCpu} onChange={e => update('defaultMaxCpu', parseInt(e.target.value))} /></div>
              <div><label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default max storage (GB)</label><input className={inputClass} type="number" value={settings.defaultMaxStorage} onChange={e => update('defaultMaxStorage', parseInt(e.target.value))} /></div>
            </>
          )}

          <div className="pt-2">
            <button onClick={save} disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </PanelLayout>
  )
}
