'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateNodePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', address: '', port: '3001', key: '', ram: '1024', cpu: '100', disk: '20' });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const key = Array.from({ length: 48 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    set('key', key);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/system/test-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: form.address, port: form.port, key: form.key }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, message: data.message ?? (data.success ? 'Connected' : 'Failed') });
    } catch {
      setTestResult({ ok: false, message: 'Request failed' });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push('/admin/nodes');
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed', 'error'); }
    } finally { setSaving(false); }
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/nodes" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">← Nodes</Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-sm text-neutral-800 dark:text-white">New node</span>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Node details</h2>
          <div><label className={labelCls}>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="US East 1" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label className={labelCls}>Address</label><input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="1.2.3.4" /></div>
            <div><label className={labelCls}>Port</label><input type="number" value={form.port} onChange={(e) => set('port', e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Daemon key</label>
            <div className="flex gap-2">
              <input value={form.key} onChange={(e) => set('key', e.target.value)} className={inputCls} placeholder="Secret key" />
              <button onClick={generateKey} className="px-3 py-2 text-xs border border-neutral-200 dark:border-white/10 rounded-xl text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5 transition shrink-0">Generate</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>RAM (MB)</label><input type="number" value={form.ram} onChange={(e) => set('ram', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>CPU (%)</label><input type="number" value={form.cpu} onChange={(e) => set('cpu', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Disk (GB)</label><input type="number" value={form.disk} onChange={(e) => set('disk', e.target.value)} className={inputCls} /></div>
          </div>
        </div>

        {testResult && (
          <div className={`rounded-xl px-4 py-3 text-sm ${testResult.ok ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
            {testResult.message}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={testConnection} disabled={testing} className="px-4 py-2 text-sm font-medium border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition disabled:opacity-50">
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
            {saving ? 'Creating…' : 'Create node'}
          </button>
        </div>
      </div>
    </div>
  );
}
