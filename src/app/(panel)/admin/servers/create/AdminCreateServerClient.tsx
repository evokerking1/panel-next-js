'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Node { id: number; name: string; address: string; allocatedPorts: string; }
interface Image { id: number; name: string; dockerImages: string; variables: string; startup: string; }
interface User { id: number; username: string; }
interface Props { nodes: Node[]; images: Image[]; users: User[]; }

export default function AdminCreateServerClient({ nodes, images, users }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', description: '', nodeId: nodes[0]?.id ?? 0, imageId: images[0]?.id ?? 0,
    ownerId: users[0]?.id ?? 0, port: '', Memory: 1024, Cpu: 100, Storage: 20,
    dockerImage: '', allowStartupEdit: false,
  });
  const [variables, setVariables] = useState<any[]>([]);
  const [dockerOptions, setDockerOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedImage = images.find((i) => i.id === form.imageId);
  const selectedNode = nodes.find((n) => n.id === form.nodeId);

  useEffect(() => {
    if (!selectedImage) return;
    try {
      const imgs: Record<string, string>[] = JSON.parse(selectedImage.dockerImages);
      const keys = imgs.flatMap(Object.keys);
      setDockerOptions(keys);
      setForm((f) => ({ ...f, dockerImage: keys[0] ?? '' }));
    } catch { setDockerOptions([]); }
    try { setVariables(JSON.parse(selectedImage.variables)); } catch { setVariables([]); }
  }, [form.imageId]);

  const allocatedPorts = (() => {
    try { return JSON.parse(selectedNode?.allocatedPorts || '[]') as number[]; } catch { return []; }
  })();

  function set(k: string, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  function setVar(idx: number, value: string) {
    setVariables((v) => { const next = [...v]; next[idx] = { ...next[idx], value }; return next; });
  }

  async function create() {
    if (!form.name.trim() || !form.port) { window.showToast?.('Name and port are required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, variables }),
      });
      const data = await res.json();
      if (res.ok) { window.showToast?.('Server created', 'success'); router.push('/admin/servers'); }
      else window.showToast?.(data.error ?? 'Failed', 'error');
    } finally { setSaving(false); }
  }

  const lbl = 'block text-xs font-medium text-neutral-500 mb-1.5';
  const inp = 'w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/servers" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">← Servers</Link>
        <span className="text-neutral-300 dark:text-neutral-600">/</span>
        <span className="text-sm text-neutral-800 dark:text-white">New server</span>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Basic info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Server name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Owner</label>
            <select value={form.ownerId} onChange={(e) => set('ownerId', parseInt(e.target.value, 10))} className={inp}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={lbl}>Description</label><input value={form.description} onChange={(e) => set('description', e.target.value)} className={inp} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Node &amp; Image</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lbl}>Node</label>
            <select value={form.nodeId} onChange={(e) => set('nodeId', parseInt(e.target.value, 10))} className={inp}>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
            </select>
          </div>
          <div><label className={lbl}>Port</label>
            {allocatedPorts.length > 0
              ? <select value={form.port} onChange={(e) => set('port', e.target.value)} className={inp}>
                  <option value="">Select port</option>
                  {allocatedPorts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              : <input value={form.port} onChange={(e) => set('port', e.target.value)} className={inp} placeholder="25565" />}
          </div>
          <div><label className={lbl}>Image</label>
            <select value={form.imageId} onChange={(e) => set('imageId', parseInt(e.target.value, 10))} className={inp}>
              {images.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          {dockerOptions.length > 0 && (
            <div><label className={lbl}>Docker image</label>
              <select value={form.dockerImage} onChange={(e) => set('dockerImage', e.target.value)} className={inp}>
                {dockerOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Resources</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={lbl}>Memory (MB)</label><input type="number" value={form.Memory} onChange={(e) => set('Memory', parseInt(e.target.value, 10))} className={inp} /></div>
          <div><label className={lbl}>CPU (%)</label><input type="number" value={form.Cpu} onChange={(e) => set('Cpu', parseInt(e.target.value, 10))} className={inp} /></div>
          <div><label className={lbl}>Storage (GB)</label><input type="number" value={form.Storage} onChange={(e) => set('Storage', parseInt(e.target.value, 10))} className={inp} /></div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={form.allowStartupEdit} onChange={(e) => set('allowStartupEdit', e.target.checked)} className="rounded" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Allow user to edit startup command</span>
        </label>
      </div>

      {variables.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Variables</h2>
          {variables.map((v, i) => (
            <div key={i}>
              <label className={lbl}>{v.name} <span className="font-mono text-neutral-400">({v.env_variable || v.env})</span></label>
              <input value={v.value ?? v.default_value ?? ''} onChange={(e) => setVar(i, e.target.value)} className={inp} placeholder={String(v.default_value ?? '')} />
            </div>
          ))}
        </div>
      )}

      <button onClick={create} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
        {saving ? 'Creating…' : 'Create server'}
      </button>
    </div>
  );
}
