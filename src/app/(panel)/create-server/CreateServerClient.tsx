'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  nodes: { id: number; name: string; address: string }[];
  images: { id: number; name: string; description: string }[];
  limits: { maxMemory: number; maxCpu: number; maxStorage: number };
}

export default function CreateServerClient({ nodes, images, limits }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', description: '', nodeId: nodes[0]?.id ?? 0,
    imageId: images[0]?.id ?? 0,
    memory: limits.maxMemory, cpu: limits.maxCpu, storage: limits.maxStorage,
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  async function create() {
    if (!form.name.trim()) { window.showToast?.('Server name is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/servers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.UUID) router.push(`/server/${data.UUID}`);
      else window.showToast?.(data.error ?? 'Failed to create server', 'error');
    } finally { setSaving(false); }
  }

  const labelCls = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-xl space-y-6">
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <div><label className={labelCls}>Server name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="My server" /></div>
        <div><label className={labelCls}>Description (optional)</label><input value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Node</label>
          <select value={form.nodeId} onChange={(e) => set('nodeId', parseInt(e.target.value, 10))} className={inputCls}>
            {nodes.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Image</label>
          <select value={form.imageId} onChange={(e) => set('imageId', parseInt(e.target.value, 10))} className={inputCls}>
            {images.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Memory (MB)</label><input type="number" max={limits.maxMemory} value={form.memory} onChange={(e) => set('memory', parseInt(e.target.value, 10))} className={inputCls} /></div>
          <div><label className={labelCls}>CPU (%)</label><input type="number" max={limits.maxCpu} value={form.cpu} onChange={(e) => set('cpu', parseInt(e.target.value, 10))} className={inputCls} /></div>
          <div><label className={labelCls}>Storage (GB)</label><input type="number" max={limits.maxStorage} value={form.storage} onChange={(e) => set('storage', parseInt(e.target.value, 10))} className={inputCls} /></div>
        </div>
      </div>
      <button onClick={create} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
        {saving ? 'Creating…' : 'Create server'}
      </button>
    </div>
  );
}
