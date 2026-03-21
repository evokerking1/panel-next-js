'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ALL_PERMISSIONS = [
  'airlink.api.users.read','airlink.api.users.create','airlink.api.users.update','airlink.api.users.delete',
  'airlink.api.servers.read','airlink.api.servers.create','airlink.api.servers.update','airlink.api.servers.delete',
  'airlink.api.nodes.read','airlink.api.nodes.create','airlink.api.nodes.update','airlink.api.nodes.delete',
  'airlink.api.settings.read','airlink.api.settings.update',
  'airlink.api.keys.view','airlink.api.keys.create','airlink.api.keys.delete','airlink.api.keys.edit',
];

interface ApiKey {
  id: number; name: string; key: string; description: string;
  permissions: string; active: boolean; createdAt: string; owner: string | null;
}

export default function ApiKeysClient({ keys: initial, hashed }: { keys: ApiKey[]; hashed: boolean }) {
  const router = useRouter();
  const [keys, setKeys] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', description: '', permissions: [] as string[] });
  const [showCreate, setShowCreate] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function togglePerm(p: string) {
    setNewKey((k) => ({
      ...k,
      permissions: k.permissions.includes(p) ? k.permissions.filter((x) => x !== p) : [...k.permissions, p],
    }));
  }

  async function createKey() {
    if (!newKey.name.trim()) { window.showToast?.('Name is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedKey(data.rawKey);
        setShowCreate(false);
        setNewKey({ name: '', description: '', permissions: [] });
        router.refresh();
      } else {
        window.showToast?.(data.error ?? 'Failed', 'error');
      }
    } finally { setSaving(false); }
  }

  async function deleteKey(id: number) {
    if (!confirm('Delete this API key?')) return;
    const res = await fetch(`/api/admin/apikeys/${id}`, { method: 'DELETE' });
    if (res.ok) { setKeys((k) => k.filter((x) => x.id !== id)); window.showToast?.('Key deleted', 'success'); }
    else window.showToast?.('Failed to delete', 'error');
  }

  async function toggleActive(id: number, active: boolean) {
    const res = await fetch(`/api/admin/apikeys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) {
      setKeys((k) => k.map((x) => x.id === id ? { ...x, active: !active } : x));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New key
        </button>
        {hashed && (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-1 rounded-lg">
            Keys are hashed — raw values shown only at creation
          </span>
        )}
      </div>

      {createdKey && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 space-y-2">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">API key created. Copy it now — it will not be shown again.</p>
          <code className="block text-xs font-mono bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-3 py-2 text-neutral-800 dark:text-white break-all">
            {createdKey}
          </code>
          <button onClick={() => { navigator.clipboard.writeText(createdKey); window.showToast?.('Copied', 'success'); }} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
            Copy to clipboard
          </button>
          <button onClick={() => setCreatedKey(null)} className="ml-4 text-xs text-neutral-400 hover:underline">Dismiss</button>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-neutral-500">No API keys yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden md:table-cell">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden lg:table-cell">Created</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-neutral-100 dark:border-white/3 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-800 dark:text-white">{k.name}</p>
                    {k.description && <p className="text-xs text-neutral-400">{k.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-neutral-500 hidden md:table-cell">{k.owner ?? '—'}</td>
                  <td className="px-5 py-3 text-neutral-500 hidden lg:table-cell text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(k.id, k.active)}
                      className={`text-xs px-2 py-0.5 rounded-full transition ${k.active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-white/5 text-neutral-500'}`}
                    >
                      {k.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deleteKey(k.id)} className="text-xs text-red-500 hover:text-red-700 transition">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Create API key</h3>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Name</label>
              <input value={newKey.name} onChange={(e) => setNewKey((k) => ({ ...k, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
                placeholder="My integration" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description (optional)</label>
              <input value={newKey.description} onChange={(e) => setNewKey((k) => ({ ...k, description: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition" />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">Permissions</label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {ALL_PERMISSIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" checked={newKey.permissions.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                    <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 rounded-xl hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
              <button onClick={createKey} disabled={saving} className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
