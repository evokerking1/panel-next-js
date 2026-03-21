'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  user: {
    id: number; username: string; email: string; isAdmin: boolean;
    description: string; serverLimit: number | null; maxMemory: number | null;
    maxCpu: number | null; maxStorage: number | null;
    servers: { UUID: string; name: string }[];
    loginHistory: { id: number; ipAddress: string | null; userAgent: string | null; timestamp: string }[];
  };
  defaultLimits: { serverLimit: number; maxMemory: number; maxCpu: number; maxStorage: number };
}

export default function UserEditClient({ user, defaultLimits }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    username: user.username, email: user.email, isAdmin: user.isAdmin,
    description: user.description, password: '',
    serverLimit: user.serverLimit ?? '', maxMemory: user.maxMemory ?? '',
    maxCpu: user.maxCpu ?? '', maxStorage: user.maxStorage ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set(key: string, value: any) { setForm((f) => ({ ...f, [key]: value })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { window.showToast?.('User updated', 'success'); router.refresh(); }
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed to update user', 'error'); }
    } finally { setSaving(false); }
  }

  async function deleteUser() {
    if (!confirm(`Delete user ${user.username}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/users');
    else { window.showToast?.('Failed to delete user', 'error'); setDeleting(false); }
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/users" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">← Users</Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-sm text-neutral-800 dark:text-white">{user.username}</span>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Account details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Username</label><input value={form.username} onChange={(e) => set('username', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>New password (leave blank to keep)</label><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder="••••••••" /></div>
          <div><label className={labelCls}>Description</label><input value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} /></div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.isAdmin} onChange={(e) => set('isAdmin', e.target.checked)} className="rounded" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Administrator</span>
        </label>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Resource limits <span className="text-xs font-normal text-neutral-400">(blank = use panel default)</span></h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'serverLimit', label: 'Server limit', hint: `default: ${defaultLimits.serverLimit}` },
            { key: 'maxMemory', label: 'Max memory (MB)', hint: `default: ${defaultLimits.maxMemory}` },
            { key: 'maxCpu', label: 'Max CPU (%)', hint: `default: ${defaultLimits.maxCpu}` },
            { key: 'maxStorage', label: 'Max storage (GB)', hint: `default: ${defaultLimits.maxStorage}` },
          ].map((f) => (
            <div key={f.key}>
              <label className={labelCls}>{f.label} <span className="text-neutral-400">({f.hint})</span></label>
              <input
                type="number"
                value={form[f.key as keyof typeof form] as any}
                onChange={(e) => set(f.key, e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className={inputCls}
                placeholder="Panel default"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={deleteUser} disabled={deleting} className="px-4 py-2 text-sm font-medium border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete user'}
        </button>
      </div>

      {user.servers.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">Servers ({user.servers.length})</h2>
          <div className="space-y-1">
            {user.servers.map((s) => (
              <Link key={s.UUID} href={`/server/${s.UUID}`} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/3 transition text-sm text-neutral-700 dark:text-neutral-300">
                <span>{s.name}</span>
                <span className="text-xs text-neutral-400 font-mono">{s.UUID.slice(0, 8)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {user.loginHistory.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">Recent logins</h2>
          <div className="space-y-1">
            {user.loginHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-2 text-xs text-neutral-500">
                <span className="font-mono">{h.ipAddress ?? 'unknown'}</span>
                <span>{new Date(h.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
