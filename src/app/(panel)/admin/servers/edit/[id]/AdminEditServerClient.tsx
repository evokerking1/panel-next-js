'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  server: {
    id: number; UUID: string; name: string; description: string;
    nodeId: number; imageId: number; ownerId: number;
    Memory: number; Cpu: number; Storage: number;
    StartCommand: string; Suspended: boolean; allowStartupEdit: boolean;
  };
  nodes: { id: number; name: string }[];
  images: { id: number; name: string }[];
  users: { id: number; username: string }[];
}

export default function AdminEditServerClient({ server, nodes, images, users }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ ...server });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/servers/${server.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { window.showToast?.('Server updated', 'success'); router.refresh(); }
      else { const d = await res.json(); window.showToast?.(d.error ?? 'Failed', 'error'); }
    } finally { setSaving(false); }
  }

  async function deleteServer() {
    if (!confirm(`Permanently delete "${server.name}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/servers/${server.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/servers');
    else { window.showToast?.('Failed to delete', 'error'); setDeleting(false); }
  }

  const lbl = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inp = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/servers" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">← Servers</Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-sm text-neutral-800 dark:text-white">{server.name}</span>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Owner</label>
            <select value={form.ownerId} onChange={(e) => set('ownerId', parseInt(e.target.value, 10))} className={inp}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={lbl}>Description</label><input value={form.description} onChange={(e) => set('description', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Node</label>
            <select value={form.nodeId} onChange={(e) => set('nodeId', parseInt(e.target.value, 10))} className={inp}>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Image</label>
            <select value={form.imageId} onChange={(e) => set('imageId', parseInt(e.target.value, 10))} className={inp}>
              {images.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={lbl}>Startup command</label><input value={form.StartCommand} onChange={(e) => set('StartCommand', e.target.value)} className={`${inp} font-mono`} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Resources</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={lbl}>Memory (MB)</label><input type="number" value={form.Memory} onChange={(e) => set('Memory', parseInt(e.target.value, 10))} className={inp} /></div>
          <div><label className={lbl}>CPU (%)</label><input type="number" value={form.Cpu} onChange={(e) => set('Cpu', parseInt(e.target.value, 10))} className={inp} /></div>
          <div><label className={lbl}>Storage (GB)</label><input type="number" value={form.Storage} onChange={(e) => set('Storage', parseInt(e.target.value, 10))} className={inp} /></div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.allowStartupEdit} onChange={(e) => set('allowStartupEdit', e.target.checked)} className="rounded" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Allow user to edit startup command</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.Suspended} onChange={(e) => set('Suspended', e.target.checked)} className="rounded" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Suspended</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={deleteServer} disabled={deleting} className="px-4 py-2 text-sm font-medium border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-50">
          {deleting ? 'Deleting…' : 'Delete server'}
        </button>
        <Link href={`/server/${server.UUID}`} className="px-4 py-2 text-sm font-medium border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition">
          Open console
        </Link>
      </div>
    </div>
  );
}
