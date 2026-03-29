'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function CreateUserPage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', username: '', password: '', isAdmin: false })

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, isAdmin: String(form.isAdmin) }),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('User created.', 'success')
      router.push('/admin/users')
    } else {
      showToast(d.error || 'Failed to create user.', 'error')
      setCreating(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition'

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/users" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Create user</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Add a new user account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Email</label>
            <input type="email" required placeholder="user@example.com"
              value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Username</label>
            <input type="text" required placeholder="username"
              value={form.username} onChange={e => set('username', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Password</label>
            <input type="password" required placeholder="••••••••"
              value={form.password} onChange={e => set('password', e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-neutral-200 dark:border-white/5">
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Admin access</p>
              <p className="text-xs text-neutral-500 mt-0.5">Give this user full admin privileges.</p>
            </div>
            <button type="button"
              onClick={() => set('isAdmin', !form.isAdmin)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isAdmin ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-neutral-900 rounded-full shadow transition-transform ${form.isAdmin ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {creating ? 'Creating…' : 'Create user'}
            </button>
            <Link href="/admin/users"
              className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PanelLayout>
  )
}
