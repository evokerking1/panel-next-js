'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface UserDetail {
  id: number
  email: string
  username?: string
  isAdmin: boolean
  description?: string
  serverLimit?: number | null
  maxMemory?: number | null
  maxCpu?: number | null
  maxStorage?: number | null
  loginAttempts: number
  lockedUntil?: string | null
  servers: { UUID: string; name: string; node: { name: string } }[]
  loginHistory: { id: number; ipAddress?: string; userAgent?: string; timestamp: string }[]
}

function Inner({ id }: { id: string }) {
  const { showToast } = useToastContext()
  const { user: authUser } = useAuth({ require: true, adminOnly: true })
  const router = useRouter()
  const [userData, setUserData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '', username: '', description: '', isAdmin: false, password: '',
    serverLimit: '', maxMemory: '', maxCpu: '', maxStorage: '',
  })

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          const u = d.user
          setUserData(u)
          setForm({
            email: u.email,
            username: u.username || '',
            description: u.description || '',
            isAdmin: u.isAdmin,
            password: '',
            serverLimit: u.serverLimit != null ? String(u.serverLimit) : '',
            maxMemory: u.maxMemory != null ? String(u.maxMemory) : '',
            maxCpu: u.maxCpu != null ? String(u.maxCpu) : '',
            maxStorage: u.maxStorage != null ? String(u.maxStorage) : '',
          })
        }
      })
      .catch(() => showToast('Failed to load user.', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = {
      email: form.email,
      username: form.username,
      description: form.description,
      isAdmin: form.isAdmin,
      serverLimit: form.serverLimit === '' ? null : Number(form.serverLimit),
      maxMemory: form.maxMemory === '' ? null : Number(form.maxMemory),
      maxCpu: form.maxCpu === '' ? null : Number(form.maxCpu),
      maxStorage: form.maxStorage === '' ? null : Number(form.maxStorage),
    }
    if (form.password.trim()) payload.password = form.password.trim()

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (res.ok) showToast('User updated.', 'success')
    else showToast(d.error || 'Failed to update.', 'error')
    setSaving(false)
  }

  const inputClass = "w-full rounded-xl text-sm px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-700/20 border border-neutral-200 dark:border-white/5 text-neutral-800 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition"

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    </div>
  )

  if (!userData) return <div className="px-8 py-12 text-sm text-neutral-400">User not found.</div>

  const avatarSrc = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userData.username || userData.email)}`

  return (
    <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="flex items-center gap-3">
          <img src={avatarSrc} className="h-9 w-9 rounded-xl border border-neutral-200 dark:border-white/10" alt="" />
          <div>
            <h1 className="text-sm font-semibold text-neutral-800 dark:text-white">{userData.username || userData.email}</h1>
            <p className="text-xs text-neutral-500">#{String(userData.id).padStart(4, '0')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={save} className="space-y-5">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Profile</h2>
              <div className="space-y-3">
                <div><label className="block text-xs text-neutral-500 mb-1">Email</label><input type="email" className={inputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Username</label><input className={inputClass} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">About</label><input className={inputClass} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">New password <span className="text-neutral-400">(leave blank to keep)</span></label><input type="password" className={inputClass} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="rounded" disabled={userData.id === authUser?.id} />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Admin</span>
                </label>
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Resource Limits</h2>
              <p className="text-xs text-neutral-500 mb-4">Leave blank to use the global defaults from settings.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-neutral-500 mb-1">Server limit</label><input type="number" min="0" className={inputClass} value={form.serverLimit} onChange={e => setForm(f => ({ ...f, serverLimit: e.target.value }))} placeholder="Global default" /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Max memory (MB)</label><input type="number" min="0" className={inputClass} value={form.maxMemory} onChange={e => setForm(f => ({ ...f, maxMemory: e.target.value }))} placeholder="Global default" /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Max CPU (%)</label><input type="number" min="0" className={inputClass} value={form.maxCpu} onChange={e => setForm(f => ({ ...f, maxCpu: e.target.value }))} placeholder="Global default" /></div>
                <div><label className="block text-xs text-neutral-500 mb-1">Max storage (GB)</label><input type="number" min="0" className={inputClass} value={form.maxStorage} onChange={e => setForm(f => ({ ...f, maxStorage: e.target.value }))} placeholder="Global default" /></div>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-4">
            <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3 uppercase tracking-wide">Servers ({userData.servers.length})</h3>
            {userData.servers.length === 0
              ? <p className="text-xs text-neutral-400">No servers.</p>
              : <div className="space-y-1.5">
                  {userData.servers.map(s => (
                    <Link key={s.UUID} href={`/server/${s.UUID}`}
                      className="flex items-center justify-between text-xs hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg px-2 py-1.5 transition">
                      <span className="text-neutral-700 dark:text-neutral-300 truncate">{s.name}</span>
                      <span className="text-neutral-400 shrink-0 ml-2">{s.node.name}</span>
                    </Link>
                  ))}
                </div>}
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 p-4">
            <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3 uppercase tracking-wide">Login History</h3>
            {userData.loginHistory.length === 0
              ? <p className="text-xs text-neutral-400">No history.</p>
              : <div className="space-y-2">
                  {userData.loginHistory.slice(0, 5).map(l => (
                    <div key={l.id} className="text-xs">
                      <p className="font-mono text-neutral-600 dark:text-neutral-400">{l.ipAddress || 'Unknown'}</p>
                      <p className="text-neutral-400">{new Date(l.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>}
          </div>

          {(userData.loginAttempts > 0 || (userData.lockedUntil && new Date(userData.lockedUntil) > new Date())) && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Account status</p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-1">
                {userData.lockedUntil && new Date(userData.lockedUntil) > new Date()
                  ? `Locked until ${new Date(userData.lockedUntil).toLocaleString()}`
                  : `${userData.loginAttempts} failed attempt(s)`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <PanelLayout>
      <Inner id={id} />
    </PanelLayout>
  )
}
