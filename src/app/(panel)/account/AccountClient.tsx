'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  user: { id: number; username: string; email: string; description: string; avatar: string | null; isAdmin: boolean };
  loginHistory: { id: number; ipAddress: string | null; userAgent: string | null; timestamp: string }[];
  apiKeys: { id: number; name: string; key: string; active: boolean; createdAt: string }[];
}

export default function AccountClient({ user, loginHistory, apiKeys }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ username: user.username, email: user.email, description: user.description });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function setP(k: string, v: string) { setPasswords((p) => ({ ...p, [k]: v })); }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { window.showToast?.('Profile saved', 'success'); router.refresh(); }
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed', 'error'); }
    } finally { setSaving(false); }
  }

  async function changePassword() {
    if (passwords.next !== passwords.confirm) { window.showToast?.('Passwords do not match', 'error'); return; }
    if (passwords.next.length < 8) { window.showToast?.('Password must be at least 8 characters', 'error'); return; }
    setChangingPw(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      if (res.ok) { window.showToast?.('Password changed', 'success'); setPasswords({ current: '', next: '', confirm: '' }); }
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed', 'error'); }
    } finally { setChangingPw(false); }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <img
          src={user.avatar ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.username)}`}
          alt=""
          className="h-14 w-14 rounded-2xl border border-neutral-200 dark:border-white/10"
        />
        <div>
          <p className="font-semibold text-neutral-800 dark:text-white">{user.username}</p>
          <p className="text-sm text-neutral-500">{user.email}</p>
          {user.isAdmin && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 mt-1 inline-block">Admin</span>
          )}
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="ml-auto px-3 py-1.5 text-xs border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Username</label><input value={form.username} onChange={(e) => setF('username', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>About me</label><input value={form.description} onChange={(e) => setF('description', e.target.value)} className={inputCls} placeholder="No About Me" /></div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      {/* Password */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Change password</h2>
        <div className="space-y-3">
          <div><label className={labelCls}>Current password</label><input type="password" value={passwords.current} onChange={(e) => setP('current', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>New password</label><input type="password" value={passwords.next} onChange={(e) => setP('next', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Confirm new password</label><input type="password" value={passwords.confirm} onChange={(e) => setP('confirm', e.target.value)} className={inputCls} /></div>
        </div>
        <button onClick={changePassword} disabled={changingPw} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
          {changingPw ? 'Changing…' : 'Change password'}
        </button>
      </div>

      {/* Login history */}
      {loginHistory.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-3">Recent logins</h2>
          <div className="space-y-1">
            {loginHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-1.5 text-xs text-neutral-500">
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
