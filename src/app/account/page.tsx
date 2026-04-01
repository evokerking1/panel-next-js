'use client'

import { useState, useEffect, useRef } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface LoginEntry { id: number; ipAddress?: string; userAgent?: string; timestamp: string }
interface FullUser {
  id: number
  email: string
  username: string
  description?: string
  isAdmin: boolean
  avatar?: string | null
  loginHistory: LoginEntry[]
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [avatarSrc, setAvatarSrc] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [form, setForm] = useState({ username: '', description: '', email: '', currentPassword: '', newPassword: '' })

  useEffect(() => {
    if (!user) return
    fetch('/api/user/account')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setFullUser(d.user)
          setForm(f => ({ ...f, username: d.user.username || '', description: d.user.description || '', email: d.user.email }))
          updateAvatarSrc(d.user.username, d.user.avatar)
        }
      })
      .catch(() => {})
  }, [user])

  function updateAvatarSrc(username: string, avatar: string | null | undefined) {
    if (avatar) {
      setAvatarSrc(avatar.startsWith('/') ? avatar : `/${avatar}`)
    } else {
      setAvatarSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=525252&color=fff&size=128`)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await fetch('/api/user/avatar', { method: 'POST', body: fd })
    const d = await res.json()
    if (res.ok) {
      setAvatarSrc(d.avatar + '?t=' + Date.now())
      setFullUser(prev => prev ? { ...prev, avatar: d.avatar } : prev)
      showToast('Avatar updated.', 'success')
    } else {
      showToast(d.error || 'Upload failed.', 'error')
    }
    setUploadingAvatar(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function removeAvatar() {
    setUploadingAvatar(true)
    const res = await fetch('/api/user/avatar', { method: 'DELETE' })
    if (res.ok) {
      setFullUser(prev => {
        if (!prev) return prev
        updateAvatarSrc(prev.username, null)
        return { ...prev, avatar: null }
      })
      showToast('Avatar removed.', 'success')
    } else {
      showToast('Failed to remove avatar.', 'error')
    }
    setUploadingAvatar(false)
  }

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
      if (fullUser) updateAvatarSrc(form.username || fullUser.username, fullUser.avatar)
    } else {
      showToast(d.error || 'Failed to update.', 'error')
    }
    setSaving(false)
  }

  if (authLoading || !fullUser) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
      </div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">

        <div className="flex items-center gap-4 mb-7">
          <div className="relative shrink-0">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="h-14 w-14 rounded-xl border border-neutral-200 dark:border-white/10 object-cover"
            />
            <label
              htmlFor="avatar-input"
              title="Upload photo"
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-800 dark:bg-white border-2 border-white dark:border-neutral-900 cursor-pointer hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
            >
              {uploadingAvatar ? (
                <div className="w-2.5 h-2.5 border border-white dark:border-neutral-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3 text-white dark:text-neutral-900">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              )}
            </label>
            <input
              id="avatar-input"
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {fullUser.avatar && (
              <button
                onClick={removeAvatar}
                disabled={uploadingAvatar}
                title="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 border-2 border-white dark:border-neutral-900 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Account</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Manage your profile and preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Profile</h2>
            <form onSubmit={save} className="space-y-4">
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

              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
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
