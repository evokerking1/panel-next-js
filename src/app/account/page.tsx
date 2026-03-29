'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface LoginEntry { id: number; ipAddress?: string; userAgent?: string; timestamp: string }
interface FullUser { id: number; email: string; username: string; description?: string; isAdmin: boolean; loginHistory: LoginEntry[] }

export default function AccountPage() {
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ username: '', description: '', email: '', currentPassword: '', newPassword: '' })

  useEffect(() => {
    if (!user) return
    fetch('/api/user/account').then(r => r.json()).then(d => {
      if (d.user) {
        setFullUser(d.user)
        setForm(f => ({ ...f, username: d.user.username || '', description: d.user.description || '', email: d.user.email }))
      }
    }).catch(() => {})
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload: Record<string, string> = {
      username: form.username,
      description: form.description,
      email: form.email,
    }
    if (form.newPassword) {
      payload.newPassword = form.newPassword
      payload.currentPassword = form.currentPassword
    }
    const res = await fetch('/api/user/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Profile updated.', 'success')
      setForm(f => ({ ...f, currentPassword: '', newPassword: '' }))
    } else {
      showToast(d.error || 'Failed to update.', 'error')
    }
    setSaving(false)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  if (!fullUser) return (
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
        <div className="mb-6">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Account</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage your profile and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Profile</h2>
            <form onSubmit={save} className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(fullUser.username)}`}
                  className="h-16 w-16 rounded-2xl border border-neutral-200 dark:border-white/10"
                  alt=""
                />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-white">{fullUser.username}</p>
                  <p className="text-xs text-neutral-500">{fullUser.email}</p>
                  {fullUser.isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 mt-1 inline-block">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Username</label>
                <input className={inputClass} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Email</label>
                <input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">About</label>
                <input className={inputClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="No about me" />
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-white/5">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-3">Change password</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Current password</label>
                    <input className={inputClass} type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">New password <span className="text-neutral-400">(leave blank to keep)</span></label>
                    <input className={inputClass} type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Login history</h2>
            <div className="space-y-2">
              {fullUser.loginHistory.length === 0
                ? <p className="text-sm text-neutral-400">No login history.</p>
                : fullUser.loginHistory.map(entry => (
                  <div key={entry.id} className="rounded-lg border border-neutral-200 dark:border-white/5 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{entry.ipAddress || 'Unknown IP'}</span>
                      <span className="text-[10px] text-neutral-400">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    {entry.userAgent && <p className="text-[11px] text-neutral-400 mt-0.5 truncate">{entry.userAgent}</p>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </PanelLayout>
  )
}
