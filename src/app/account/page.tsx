'use client'

import { Info , Loader2} from 'lucide-react'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

interface LoginEntry {
  id: number
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

interface FullUser {
  id: number
  email: string
  username: string
  description?: string
  isAdmin: boolean
  avatar?: string | null
  loginHistory: LoginEntry[]
}

const inputClass =
  'rounded-xl border border-neutral-200 dark:border-neutral-600/30 focus:outline-none text-sm w-full px-3 py-2.5 bg-neutral-100 dark:bg-neutral-700/20 placeholder-neutral-400 text-neutral-800 dark:text-white transition focus:border-neutral-400 dark:focus:border-white/25'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 p-4">
      <p className="text-sm font-medium text-neutral-800 dark:text-white mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullUser, setFullUser] = useState<FullUser | null>(null)
  const [avatarSrc, setAvatarSrc] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '',
    description: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  })

  useEffect(() => {
    if (!user) return
    fetch('/api/user/account')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setFullUser(d.user)
          setForm(f => ({
            ...f,
            username: d.user.username || '',
            description: d.user.description || '',
            email: d.user.email,
          }))
          setAvatarSrc(resolveAvatar(d.user.username, d.user.avatar))
        }
      })
      .catch(() => {})
  }, [user])

  function resolveAvatar(username: string, avatar: string | null | undefined) {
    if (avatar) return avatar.startsWith('/') ? avatar : `/${avatar}`
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(username)}`
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
      const fallback = resolveAvatar(fullUser?.username || '', null)
      setAvatarSrc(fallback)
      setFullUser(prev => prev ? { ...prev, avatar: null } : prev)
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
    } else {
      showToast(d.error || 'Failed to update.', 'error')
    }
    setSaving(false)
  }

  if (authLoading || !fullUser) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-12 space-y-4 max-w-2xl">

        <FadeUp>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-base font-medium text-neutral-800 dark:text-white">Account</h1>
              <p className="text-xs text-neutral-500 mt-0.5">Manage your profile and preferences.</p>
            </div>
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/5 px-3 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 shadow-sm dark:shadow-none transition shrink-0 hover:bg-neutral-50 dark:hover:bg-white/10"
            >
              <Info className="w-3.5 h-3.5" />
              Credits
            </Link>
          </div>
        </FadeUp>

        {/* Profile picture */}
        <FadeUp delay={0.04}>
          <Section title="Profile picture">
            <div className="flex items-center gap-4">
              <img
                src={avatarSrc}
                alt="Avatar"
                className="h-14 w-14 rounded-xl border border-neutral-200 dark:border-white/10 object-cover shrink-0"
              />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="avatar-input"
                  className="cursor-pointer inline-block rounded-xl bg-neutral-100 dark:bg-neutral-700/30 border border-neutral-200 dark:border-neutral-600/30 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition active:scale-95 select-none"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Choose image'}
                </label>
                <input
                  id="avatar-input"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-[10px] text-neutral-400">JPG, PNG, GIF or WebP — max 2 MB</p>
                {fullUser.avatar && (
                  <button
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="text-xs text-red-500 text-left hover:text-red-400 transition"
                  >
                    Remove picture
                  </button>
                )}
              </div>
            </div>
          </Section>
        </FadeUp>

        {/* Account details */}
        <FadeUp delay={0.08}>
          <Section title="Account details">
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Username
                </label>
                <input
                  className={inputClass}
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder={fullUser.username}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Email
                </label>
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder={fullUser.email}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  className={inputClass + ' resize-none'}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="No description set"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-700/20 border border-neutral-200 dark:border-white/5 space-y-3">
                <p className="text-xs font-medium text-neutral-800 dark:text-white">Change password</p>
                <input
                  className={inputClass}
                  type="password"
                  value={form.currentPassword}
                  onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Current password"
                />
                <input
                  className={inputClass}
                  type="password"
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="New password"
                  disabled={!form.currentPassword}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-60 transition hover:bg-neutral-700 dark:hover:bg-neutral-200"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </Section>
        </FadeUp>

        {/* Login history */}
        <FadeUp delay={0.12}>
          <Section title="Login history">
            {fullUser.loginHistory.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">No login history available.</p>
            ) : (
              <div className="space-y-2">
                {fullUser.loginHistory.map(entry => (
                  <div
                    key={entry.id}
                    className="rounded-xl bg-neutral-100 dark:bg-neutral-700/20 border border-neutral-200 dark:border-white/5 px-3 py-2.5"
                  >
                    <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      {entry.ipAddress || 'Unknown IP'}
                    </p>
                    {entry.userAgent && (
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{entry.userAgent}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </FadeUp>

      </div>
    </PanelLayout>
  )
}
