'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

const inputClass = 'w-full rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-100 dark:bg-neutral-700/20 px-4 py-2.5 text-sm text-neutral-800 dark:text-white outline-none transition focus:border-neutral-400 dark:focus:border-white/20'

interface LoginHistory {
  id: number
  ipAddress?: string
  timestamp: string
}

interface UserData {
  id: number
  username: string
  email: string
  description?: string
  isAdmin: boolean
  serverLimit?: number | null
  maxMemory?: number | null
  maxCpu?: number | null
  maxStorage?: number | null
  avatar?: string | null
  loginHistory?: LoginHistory[]
  servers?: { id: number; UUID: string; name: string; node?: { name: string } }[]
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="h-6 w-11 rounded-full bg-neutral-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-neutral-600" />
    </label>
  )
}

export default function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '',
    email: '',
    description: '',
    password: '',
    isAdmin: false,
    serverLimit: '',
    maxMemory: '',
    maxCpu: '',
    maxStorage: '',
  })

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => {
        const user = d.user || d
        setUserData(user)
        setForm({
          username: user.username || '',
          email: user.email || '',
          description: user.description || '',
          password: '',
          isAdmin: !!user.isAdmin,
          serverLimit: user.serverLimit == null ? '' : String(user.serverLimit),
          maxMemory: user.maxMemory == null ? '' : String(user.maxMemory),
          maxCpu: user.maxCpu == null ? '' : String(user.maxCpu),
          maxStorage: user.maxStorage == null ? '' : String(user.maxStorage),
        })
      })
      .catch(() => showToast('Failed to load user', 'error'))
      .finally(() => setLoading(false))
  }, [id, showToast])

  function setField(key: keyof typeof form, value: string | boolean) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      showToast('User updated.', 'success')
      router.push('/admin/users')
      return
    }
    showToast(data.error || 'Failed to update user.', 'error')
    setSaving(false)
  }

  if (loading) {
    return (
      <PanelLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 pt-5 pb-8">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Edit User</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Edit user details and permissions.</p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center rounded-xl bg-neutral-950 px-3 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </div>

        <FadeUp delay={0.04}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-800/20">
                {userData && (
                  <div className="mb-5 flex items-center gap-4 border-b border-neutral-200 pb-5 dark:border-white/5">
                    <img
                      className="h-12 w-12 rounded-xl border border-neutral-200 object-cover dark:border-neutral-700/30"
                      src={userData.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userData.username)}`}
                      alt=""
                    />
                    <div>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-white">{userData.username}</p>
                      <p className="text-xs text-neutral-500">{userData.email}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-white">Username</label>
                    <input className={inputClass} value={form.username} onChange={e => setField('username', e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-white">Email</label>
                    <input className={inputClass} type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-white">Description</label>
                    <textarea className={`${inputClass} resize-none`} rows={3} value={form.description} onChange={e => setField('description', e.target.value)} />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-800/20">
                <h2 className="mb-4 text-sm font-medium text-neutral-800 dark:text-white">Limits</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">Server limit</label>
                    <input className={inputClass} type="number" value={form.serverLimit} onChange={e => setField('serverLimit', e.target.value)} placeholder="Unlimited if empty" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">Max memory (MB)</label>
                    <input className={inputClass} type="number" value={form.maxMemory} onChange={e => setField('maxMemory', e.target.value)} placeholder="Inherited if empty" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">Max CPU (%)</label>
                    <input className={inputClass} type="number" value={form.maxCpu} onChange={e => setField('maxCpu', e.target.value)} placeholder="Inherited if empty" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-neutral-500">Max storage (GB)</label>
                    <input className={inputClass} type="number" value={form.maxStorage} onChange={e => setField('maxStorage', e.target.value)} placeholder="Inherited if empty" />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-800/20">
                <h2 className="mb-4 text-sm font-medium text-neutral-800 dark:text-white">Security</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-white">
                      Reset Password <span className="text-xs font-normal text-neutral-400">(leave blank to keep current)</span>
                    </label>
                    <input className={inputClass} type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="New password" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-white">Admin access</p>
                      <p className="text-xs text-neutral-500">Grant full administrative privileges.</p>
                    </div>
                    <Toggle checked={form.isAdmin} onChange={next => setField('isAdmin', next)} />
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-800/20">
                <h2 className="mb-3 text-sm font-medium text-neutral-800 dark:text-white">Servers</h2>
                {userData?.servers?.length ? (
                  <div className="space-y-2">
                    {userData.servers.map(server => (
                      <Link
                        key={server.id}
                        href={`/server/${server.UUID}`}
                        className="block rounded-xl border border-neutral-200 bg-white px-3 py-3 transition hover:bg-neutral-50 dark:border-white/5 dark:bg-neutral-800/50 dark:hover:bg-white/5"
                      >
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">{server.name}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{server.node?.name || 'Unknown node'}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">This user has no servers.</p>
                )}
              </section>

              <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-800/20">
                <h2 className="mb-3 text-sm font-medium text-neutral-800 dark:text-white">Recent Logins</h2>
                {userData?.loginHistory?.length ? (
                  <div className="space-y-2">
                    {userData.loginHistory.map(entry => (
                      <div key={entry.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-white/5 dark:bg-neutral-800/50">
                        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{new Date(entry.timestamp).toLocaleString()}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{entry.ipAddress || 'Unknown IP'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">No login history available.</p>
                )}
              </section>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
