'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

interface Props {
  serverId: string;
  currentPath: string;
  nodeAddress: string;
  nodePort: number;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

export default function FilesClient({ serverId, currentPath, nodeAddress, nodePort }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/server/${serverId}/files?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(Array.isArray(data) ? data : data.files ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => { loadFiles(currentPath); }, [currentPath, loadFiles]);

  function navigate(path: string) {
    router.push(`/server/${serverId}/files?path=${encodeURIComponent(path)}`);
  }

  function parentPath() {
    const parts = currentPath.replace(/\/$/, '').split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }

  const pathParts = currentPath.split('/').filter(Boolean);

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    for (const name of selected) {
      try {
        await fetch(`/api/server/${serverId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', path: `${currentPath}/${name}`.replace('//', '/') }),
        });
      } catch { /* skip */ }
    }
    setSelected(new Set());
    loadFiles(currentPath);
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        <button onClick={() => navigate('/')} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">
          /
        </button>
        {pathParts.map((part, i) => {
          const path = '/' + pathParts.slice(0, i + 1).join('/');
          return (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-neutral-300 dark:text-neutral-600">/</span>
              <button
                onClick={() => navigate(path)}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
              >
                {part}
              </button>
            </span>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {currentPath !== '/' && (
          <button
            onClick={() => navigate(parentPath())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Up
          </button>
        )}
        <button
          onClick={() => loadFiles(currentPath)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
        >
          Refresh
        </button>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition ml-auto"
          >
            Delete ({selected.size})
          </button>
        )}
      </div>

      {/* File list */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-neutral-200 dark:border-neutral-700 border-t-neutral-600 dark:border-t-neutral-300 animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          {files.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-neutral-500">This directory is empty.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/5">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500 w-8">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.size === files.length && files.length > 0}
                      onChange={(e) => setSelected(e.target.checked ? new Set(files.map((f) => f.name)) : new Set())}
                    />
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-neutral-500">Name</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-neutral-500 hidden sm:table-cell">Size</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-neutral-500 hidden md:table-cell">Modified</th>
                </tr>
              </thead>
              <tbody>
                {[...files].sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0)).map((file) => {
                  const filePath = `${currentPath}/${file.name}`.replace('//', '/');
                  return (
                    <tr
                      key={file.name}
                      className="border-b border-neutral-100 dark:border-white/3 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selected.has(file.name)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(file.name); else next.delete(file.name);
                            setSelected(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition text-left w-full"
                          onClick={() => file.isDirectory ? navigate(filePath) : router.push(`/server/${serverId}/files/edit/${file.name}?path=${encodeURIComponent(currentPath)}`)}
                        >
                          {file.isDirectory ? (
                            <svg className="h-4 w-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                          <span className="truncate">{file.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-neutral-500 hidden sm:table-cell">
                        {file.isDirectory ? '—' : formatSize(file.size)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-neutral-500 hidden md:table-cell">
                        {file.modified ? formatDate(file.modified) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
