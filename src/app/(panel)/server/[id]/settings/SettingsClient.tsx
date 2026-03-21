'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  server: {
    UUID: string;
    name: string;
    description: string;
    Memory: number;
    Cpu: number;
    Storage: number;
    Suspended: boolean;
    allowStartupEdit: boolean;
    ownerId: number;
  };
  allowDelete: boolean;
  isAdmin: boolean;
}

export default function SettingsClient({ server, allowDelete, isAdmin }: Props) {
  const router = useRouter();
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/server/${server.UUID}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        window.showToast?.('Settings saved', 'success');
        router.refresh();
      } else {
        window.showToast?.('Failed to save settings', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteServer() {
    if (confirmDelete !== server.name) {
      window.showToast?.('Type the server name to confirm', 'error');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/server/${server.UUID}/settings`, { method: 'DELETE' });
      if (res.ok) router.push('/dashboard');
      else window.showToast?.('Failed to delete server', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">General</h2>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">Server name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-white/25 transition resize-none"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Resources (read-only) */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Allocated resources</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Memory', value: `${server.Memory} MB` },
            { label: 'CPU', value: `${server.Cpu}%` },
            { label: 'Storage', value: `${server.Storage} GB` },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border border-neutral-200 dark:border-white/5 px-4 py-3">
              <p className="text-xs text-neutral-500 mb-1">{r.label}</p>
              <p className="text-sm font-medium text-neutral-800 dark:text-white">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      {(allowDelete || isAdmin) && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          <p className="text-xs text-neutral-500">
            Deleting this server is permanent and cannot be undone. All data will be removed.
          </p>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Type <span className="font-mono text-neutral-800 dark:text-white">{server.name}</span> to confirm
            </label>
            <input
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 text-neutral-900 dark:text-white outline-none focus:border-red-400 transition"
              placeholder={server.name}
            />
          </div>
          <button
            onClick={deleteServer}
            disabled={deleting || confirmDelete !== server.name}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete server'}
          </button>
        </div>
      )}
    </div>
  );
}
