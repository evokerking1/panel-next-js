'use client'

import { Pencil, Trash2 , Loader2} from 'lucide-react'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp, AnimatedList } from '@/components/ui/motion'
import Modal from '@/components/ui/modal'

interface User {
  id: number
  username: string
  email: string
  isAdmin: boolean
  avatar?: string
  description?: string
  instances?: { UUID: string }[]
}

export default function AdminUsersPage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setLoading(false))
  }, [])

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

  const adminCount = users.filter(u => u.isAdmin).length

  return (
    <PanelLayout>
      <div className="panel-page panel-page-shell panel-stack">

        <div className="panel-toolbar">
          <FadeUp className="panel-page-heading">
            <h1 className="panel-page-title">Users</h1>
            <p className="panel-page-subtitle">Manage user accounts and permissions</p>
          </FadeUp>
          <FadeUp delay={0.05}>
            <Link href="/admin/users/create"
              className="inline-flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700/40 rounded-xl bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-100 px-3 py-2 text-sm font-medium transition">
              Create New User
            </Link>
          </FadeUp>
        </div>

        <FadeUp delay={0.08}>
          <div className="panel-grid">
            <div className="panel-stat-card">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-white mb-2">Total Users</h2>
              <p className="text-4xl font-normal text-neutral-800 dark:text-white">{users.length}</p>
              <p className="text-sm text-neutral-400 mt-2">No users online</p>
            </div>
            <div className="panel-stat-card">
              <h2 className="text-lg font-medium text-neutral-800 dark:text-white mb-2">Admins</h2>
              <p className="text-4xl font-normal text-neutral-800 dark:text-white">{adminCount}</p>
              <p className="text-sm text-neutral-400 mt-2">No admins online</p>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="panel-table-shell overflow-x-auto shadow-sm" id="userTable">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-5 w-5 text-neutral-400" />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/10">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Name</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Role</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Servers</th>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white sm:pl-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-neutral-800/20">
                  {users.map(u => (
                    <tr key={u.id}
                      className="hover:bg-neutral-50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/admin/users/${u.id}`}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img className="h-8 w-8 rounded-lg object-cover"
                              src={u.avatar || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.username)}`}
                              alt="" />
                          </div>
                          <div className="font-medium text-neutral-800 dark:text-white">{u.username}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${
                          u.isAdmin
                            ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 ring-emerald-600/20'
                            : 'bg-amber-600/10 text-amber-600 dark:text-amber-400 ring-amber-600/20'
                        }`}>
                          {u.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {u.instances?.length ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Link href={`/admin/users/${u.id}`}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </FadeUp>

        <Modal open={!!deleteTarget} title="Delete user?"
          body={`Delete "${deleteTarget?.username}"? This cannot be undone.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)} />
      </div>
    </PanelLayout>
  )
}
