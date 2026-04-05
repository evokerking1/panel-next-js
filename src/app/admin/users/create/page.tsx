'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'

const inputClass = "rounded-xl text-neutral-800 dark:text-white text-sm w-full px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-white/20"

export default function AdminUserCreatePage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [form, setForm] = useState({ email: '', username: '', password: '', isAdmin: false })
  const [saving, setSaving] = useState(false)

  function setField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate() {
    if (!form.email || !form.username || !form.password) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('User created.', 'success')
      router.push('/admin/users')
    } else {
      showToast(d.error || 'Failed to create user.', 'error')
    }
    setSaving(false)
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Create User</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Create a new user account.</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div id="userForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-400 text-sm font-medium mb-2">Email:</label>
                  <input type="email" className={inputClass} placeholder="example@domain.com"
                    value={form.email} onChange={e => setField('email', e.target.value)} />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-400 text-sm font-medium mb-2">Username:</label>
                  <input type="text" className={inputClass} placeholder="username"
                    value={form.username} onChange={e => setField('username', e.target.value)} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-700 dark:text-neutral-400 text-sm font-medium mb-2">Password:</label>
                  <input type="password" className={inputClass} placeholder="••••••••"
                    value={form.password} onChange={e => setField('password', e.target.value)} />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-400 text-sm font-medium mb-2">Admin:</label>
                  <div className="flex items-center mt-1">
                    <label className="relative inline-block w-12 h-6">
                      <input type="checkbox" className="sr-only peer"
                        checked={form.isAdmin} onChange={e => setField('isAdmin', e.target.checked)} />
                      <span className="block w-12 h-6 bg-neutral-400 peer-checked:bg-blue-500 rounded-full transition-colors" />
                      <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
                    </label>
                    <span className="ml-3 text-sm text-neutral-500 dark:text-neutral-400">Admin access</span>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button onClick={handleCreate} disabled={saving}
                    className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-200 text-white dark:text-neutral-800 px-5 py-2 text-sm font-medium shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </PanelLayout>
  )
}
