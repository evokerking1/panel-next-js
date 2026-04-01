'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"

interface UserData {
  id: number
  username: string
  email: string
  description?: string
  isAdmin: boolean
  serverLimit?: number
  avatar?: string
  instances?: { UUID: string; name: string }[]
}

export default function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    username: '', email: '', description: '', password: '', isAdmin: false, serverLimit: '',
  })

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => {
        const u = d.user || d
        setUserData(u)
        setForm({
          username: u.username || '',
          email: u.email || '',
          description: u.description || '',
          password: '',
          isAdmin: u.isAdmin || false,
          serverLimit: u.serverLimit != null ? String(u.serverLimit) : '',
        })
      })
      .catch(() => showToast('Failed to load user', 'error'))
      .finally(() => setLoading(false))
  }, [id])

  function setField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    const body: Record<string, unknown> = {
      username: form.username,
      email: form.email,
      description: form.description,
      isAdmin: form.isAdmin,
    }
    if (form.password) body.password = form.password
    if (form.serverLimit !== '') body.serverLimit = parseInt(form.serverLimit)

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      showToast('User updated.', 'success')
      router.push('/admin/users')
    } else {
      const d = await res.json()
      showToast(d.error || 'Failed to update user.', 'error')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <PanelLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto pt-16">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Edit User</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Edit user details and permissions.</p>
          </FadeUp>
          <FadeUp delay={0.05} className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link href="/admin/users"
              className="inline-flex items-center rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-300 text-neutral-200 dark:text-neutral-800 px-3 py-2 text-sm font-medium shadow-md transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Users
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.08}>
          <div id="userForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              {userData && (
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-neutral-200 dark:border-white/5">
                  <img className="h-12 w-12 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-neutral-700/30"
                    src={userData.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userData.username)}`}
                    alt="" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white">{userData.username}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{userData.email}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-white/10 pb-2">User Information</h2>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">Username</label>
                    <input type="text" className={inputClass} value={form.username} onChange={e => setField('username', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">Email</label>
                    <input type="email" className={inputClass} value={form.email} onChange={e => setField('email', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">Description</label>
                    <textarea className={inputClass} rows={3} value={form.description} onChange={e => setField('description', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">Server Limit</label>
                    <input type="number" className={inputClass} placeholder="Unlimited if empty" value={form.serverLimit} onChange={e => setField('serverLimit', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-white/10 pb-2">Security</h2>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">
                      New Password <span className="text-neutral-400 text-xs">(Leave blank to keep current)</span>
                    </label>
                    <input type="password" className={inputClass} placeholder="••••••••" value={form.password} onChange={e => setField('password', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-neutral-700 dark:text-white text-sm font-medium mb-2">Admin Privileges</label>
                    <div className="flex items-center gap-3 mt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.isAdmin} onChange={e => setField('isAdmin', e.target.checked)} />
                        <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Admin access</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-white/5">
                <button onClick={handleSave} disabled={saving}
                  className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-300 text-neutral-200 dark:text-neutral-800 px-4 py-2 text-sm font-medium shadow-md transition disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
