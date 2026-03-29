'use client'

import { useState, useEffect } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'

interface User {
  id: number
  email: string
  username: string
  isAdmin: boolean
  description?: string
  servers: { UUID: string }[]
  loginAttempts: number
  lockedUntil?: string | null
}

export default function AdminUsersPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', username: '', password: '', isAdmin: false })

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, isAdmin: String(form.isAdmin) }),
    })
    const d = await res.json()
    if (res.ok) {
      fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || []))
      setCreateOpen(false)
      setForm({ email: '', username: '', password: '', isAdmin: false })
      showToast('User created.', 'success')
    } else {
      showToast(d.error || 'Failed to create user.', 'error')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      showToast('User deleted.', 'success')
    } else {
      showToast('Failed to delete user.', 'error')
    }
    setDeleteTarget(null)
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Users</h1>
            <p className="text-sm text-neutral-500 mt-0.5">{users.length} registered</p>
          </div>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition w-44"
              placeholder="Search users..." />
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
              New user
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-x-auto shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
              <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                <tr>
                  {['User', 'Role', 'Servers', 'Status', 'Actions'].map(h => (
                    <th key={h} className="py-3 pl-6 pr-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <img className="h-7 w-7 rounded-lg shrink-0" src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.username || u.email)}`} alt="" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{u.username || '—'}</p>
                          <p className="text-xs text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${u.isAdmin ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30' : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'}`}>
                        {u.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{u.servers.length}</td>
                    <td className="px-3 py-3.5">
                      {u.lockedUntil && new Date(u.lockedUntil) > new Date()
                        ? <span className="text-xs text-amber-600 dark:text-amber-400">Locked</span>
                        : <span className="text-xs text-emerald-600 dark:text-emerald-400">Active</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/users/${u.id}`} className="text-xs text-blue-500 hover:underline">Edit</Link>
                        <button onClick={() => setDeleteTarget(u)} className="text-xs text-red-500 hover:underline" disabled={u.id === user?.id}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-neutral-400">No users found.</div>
            )}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-md p-6">
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-4">Create user</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div><label className="block text-xs text-neutral-500 mb-1">Email</label><input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="user@example.com" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Username</label><input className={inputClass} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required placeholder="username" /></div>
              <div><label className="block text-xs text-neutral-500 mb-1">Password</label><input className={inputClass} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="••••••••" /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} className="rounded" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Admin</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} title="Delete user?"
        body={`Permanently delete "${deleteTarget?.username}"? All their servers will remain but be unowned.`}
        confirmLabel="Delete" danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)} />
    </PanelLayout>
  )
}
