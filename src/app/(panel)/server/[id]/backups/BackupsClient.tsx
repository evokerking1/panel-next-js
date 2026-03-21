'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Backup { UUID: string; name: string; size: string; createdAt: Date; }

interface Props { serverId: string; backups: Backup[]; }

function formatBytes(b: string) {
  const n = parseInt(b, 10);
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function BackupsClient({ serverId, backups }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState(backups);

  async function createBackup() {
    if (!name.trim()) { window.showToast?.('Backup name is required', 'error'); return; }
    setCreating(true);
    const t = window.showToast?.('Creating backup…', 'loading');
    try {
      const res = await fetch(`/api/server/${serverId}/backups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setName('');
        window.showToast?.('Backup created', 'success');
        router.refresh();
      } else {
        window.showToast?.(data.error ?? 'Failed to create backup', 'error');
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteBackup(uuid: string) {
    if (!confirm('Delete this backup?')) return;
    const res = await fetch(`/api/server/${serverId}/backups/${uuid}`, { method: 'DELETE' });
    if (res.ok) { setList((l) => l.filter((b) => b.UUID !== uuid)); window.showToast?.('Backup deleted', 'success'); }
    else window.showToast?.('Failed to delete backup', 'error');
  }

  async function restoreBackup(uuid: string) {
    if (!confirm('Restore this backup? The server will be stopped.')) return;
    const res = await fetch(`/api/server/${serverId}/backups/${uuid}/restore`, { method: 'POST' });
    if (res.ok) window.showToast?.('Restore started', 'success');
    else window.showToast?.('Failed to restore backup', 'error');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">Create backup</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Backup name"
            onKeyDown={(e) => e.key === 'Enter' && createBackup()}
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/3 text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
          />
          <button
            onClick={createBackup}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-neutral-500">No backups yet. Create your first backup above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          {list.map((b, i) => (
            <div
              key={b.UUID}
              className={`flex items-center gap-4 px-5 py-3.5 ${i !== list.length - 1 ? 'border-b border-neutral-100 dark:border-white/3' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{b.name}</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {formatBytes(b.size)} · {new Date(b.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => restoreBackup(b.UUID)}
                  className="px-3 py-1.5 text-xs border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                >
                  Restore
                </button>
                <a
                  href={`/api/server/${serverId}/backups/${b.UUID}/download`}
                  className="px-3 py-1.5 text-xs border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                >
                  Download
                </a>
                <button
                  onClick={() => deleteBackup(b.UUID)}
                  className="px-3 py-1.5 text-xs border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
