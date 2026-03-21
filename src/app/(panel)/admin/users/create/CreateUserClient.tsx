'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateUserClient() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', isAdmin: false });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push('/admin/users');
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed', 'error'); }
    } finally { setSaving(false); }
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/users" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">← Users</Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-sm text-neutral-800 dark:text-white">New user</span>
      </div>
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Create user</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Username</label><input value={form.username} onChange={(e) => set('username', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Password</label><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputCls} /></div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.isAdmin} onChange={(e) => set('isAdmin', e.target.checked)} className="rounded" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Administrator</span>
        </label>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
          {saving ? 'Creating…' : 'Create user'}
        </button>
      </div>
    </div>
  );
}
