'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Settings = {
  title: string; description: string; logo: string; language: string;
  allowRegistration: boolean; uploadLimit: number;
  rateLimitEnabled: boolean; rateLimitRpm: number;
  allowUserCreateServer: boolean; allowUserDeleteServer: boolean;
  defaultServerLimit: number; defaultMaxMemory: number;
  defaultMaxCpu: number; defaultMaxStorage: number;
  loginMaxAttempts: number; loginLockoutMinutes: number;
  enforceDaemonHttps: boolean; behindReverseProxy: boolean; hashApiKeys: boolean;
};

export default function AdminSettingsClient({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  function set(key: keyof Settings, value: any) { setForm((f) => ({ ...f, [key]: value })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { window.showToast?.('Settings saved', 'success'); router.refresh(); }
      else window.showToast?.('Failed to save settings', 'error');
    } finally { setSaving(false); }
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';
  const toggleRow = (key: keyof Settings, label: string, desc?: string) => (
    <label key={key} className="flex items-start justify-between gap-4 py-3 border-b border-neutral-100 dark:border-white/3 last:border-0 cursor-pointer">
      <div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{label}</p>
        {desc && <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>}
      </div>
      <div
        onClick={() => set(key, !form[key])}
        className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors shrink-0 cursor-pointer ${form[key] ? 'bg-neutral-800 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
      >
        <div className={`h-4 w-4 rounded-full transition-transform ${form[key] ? 'translate-x-4 bg-white dark:bg-neutral-900' : 'bg-white dark:bg-neutral-400'}`} />
      </div>
    </label>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Panel title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Language</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)} className={inputCls}>
              {['en','de','es','fr','it','ja','pt','ru','ta','zh'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white mb-2">Registration &amp; access</h2>
        {toggleRow('allowRegistration', 'Allow public registration', 'Users can create accounts without an invite.')}
        {toggleRow('allowUserCreateServer', 'Users can create servers', 'Within their assigned server limit.')}
        {toggleRow('allowUserDeleteServer', 'Users can delete servers')}
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Default resource limits</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'defaultServerLimit', label: 'Server limit' },
            { key: 'defaultMaxMemory', label: 'Max memory (MB)' },
            { key: 'defaultMaxCpu', label: 'Max CPU (%)' },
            { key: 'defaultMaxStorage', label: 'Max storage (GB)' },
          ].map((f) => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              <input type="number" value={form[f.key as keyof Settings] as number} onChange={(e) => set(f.key as keyof Settings, parseInt(e.target.value, 10) || 0)} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Security</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Login max attempts</label><input type="number" value={form.loginMaxAttempts} onChange={(e) => set('loginMaxAttempts', parseInt(e.target.value, 10))} className={inputCls} /></div>
          <div><label className={labelCls}>Lockout minutes</label><input type="number" value={form.loginLockoutMinutes} onChange={(e) => set('loginLockoutMinutes', parseInt(e.target.value, 10))} className={inputCls} /></div>
        </div>
        {toggleRow('rateLimitEnabled', 'Rate limiting enabled')}
        {form.rateLimitEnabled && (
          <div><label className={labelCls}>Requests per minute</label><input type="number" value={form.rateLimitRpm} onChange={(e) => set('rateLimitRpm', parseInt(e.target.value, 10))} className={inputCls} /></div>
        )}
        {toggleRow('enforceDaemonHttps', 'Enforce HTTPS for daemon connections')}
        {toggleRow('behindReverseProxy', 'Behind a reverse proxy', 'Enables trust proxy for correct client IP detection.')}
        {toggleRow('hashApiKeys', 'Hash API keys in database', 'Stored as SHA-256. Existing keys will need to be regenerated.')}
      </div>

      <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}
