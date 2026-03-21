'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Server {
  UUID: string;
  name: string;
  description: string | null;
  status: string;
  ramUsage: string;
  cpuUsage: string;
  ramUsed: string;
  nodeOffline: boolean;
  node: { name: string };
}

interface Folder {
  id: number;
  name: string;
  members: { serverUUID: string }[];
}

interface Props {
  user: { id: number; isAdmin: boolean; username: string };
  servers: Server[];
  allServers: Server[];
  folders: Folder[];
  canCreateServer: boolean;
  currentPage: number;
  totalPages: number;
  daemonOffline: boolean;
  err?: string;
}

function StatusDot({ status }: { status: string }) {
  if (status === 'running') return <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />;
  if (status === 'stopped') return <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />;
}

function ServerCard({ server, view }: { server: Server; view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <Link
        href={`/server/${server.UUID}`}
        className="flex items-center gap-4 px-4 py-3 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition-colors group"
      >
        <StatusDot status={server.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{server.name}</p>
          <p className="text-xs text-neutral-500 truncate">{server.node.name}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-500">
          <span>CPU {server.cpuUsage}%</span>
          <span>{server.ramUsed}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/server/${server.UUID}`}
      className="block p-4 rounded-xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/[0.04] hover:border-neutral-300 dark:hover:border-white/10 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={server.status} />
          <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{server.name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
          server.status === 'running'
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : server.status === 'stopped'
            ? 'bg-neutral-100 dark:bg-white/5 text-neutral-500'
            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
        }`}>
          {server.status}
        </span>
      </div>

      {server.description && (
        <p className="text-xs text-neutral-500 truncate mb-3">{server.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          {server.node.name}
        </span>
        {server.status === 'running' && (
          <>
            <span>CPU {server.cpuUsage}%</span>
            <span>{server.ramUsed}</span>
          </>
        )}
      </div>
    </Link>
  );
}

function FolderCard({ folder, servers, onOpen }: { folder: Folder; servers: Server[]; onOpen: (f: Folder) => void }) {
  const count = folder.members.length;
  return (
    <button
      onClick={() => onOpen(folder)}
      className="flex items-center gap-3 px-3 py-3 rounded-xl border border-neutral-200 dark:border-white/7 bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] hover:border-neutral-300 dark:hover:border-white/12 transition-all text-left w-full"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-500 shrink-0">
        <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15ZM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 dark:text-white truncate">{folder.name}</p>
        <p className="text-xs text-neutral-500">{count} server{count !== 1 ? 's' : ''}</p>
      </div>
    </button>
  );
}

export default function DashboardClient({
  user,
  servers,
  allServers,
  folders,
  canCreateServer,
  currentPage,
  totalPages,
  daemonOffline,
  err,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName('');
        setShowNewFolder(false);
        router.refresh();
      }
    } catch {
      window.showToast?.('Failed to create folder', 'error');
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, router]);

  const folderServers = openFolder
    ? allServers.filter((s) => openFolder.members.some((m) => m.serverUUID === s.UUID))
    : [];

  const isEmpty = servers.length === 0 && folders.length === 0;

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {canCreateServer && (
            <Link
              href="/create-server"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
              </svg>
              New server
            </Link>
          )}

          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            New folder
          </button>

          {servers.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                  view === 'grid'
                    ? 'bg-white dark:bg-white/8 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                  view === 'list'
                    ? 'bg-white dark:bg-white/8 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {err === 'NOTACTIVEYET' && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-800/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 mb-5">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Awaiting Installation</p>
          <p className="text-xs text-amber-600 dark:text-amber-400/60 mt-0.5">The server isn&apos;t installed yet or is in a failed state.</p>
        </div>
      )}
      {err === 'SERVER_LIMIT_REACHED' && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-800/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 mb-5">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Server limit reached</p>
          <p className="text-xs text-amber-600 dark:text-amber-400/60 mt-0.5">You have reached the maximum number of servers allowed.</p>
        </div>
      )}
      {daemonOffline && (
        <div className="rounded-xl bg-red-50 dark:bg-red-800/10 border border-red-200 dark:border-red-500/20 px-4 py-3 mb-5">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Connection Error</p>
          <p className="text-xs text-red-600 dark:text-red-400/60 mt-0.5">One or more nodes are offline. Some information may be unavailable.</p>
          <button
            onClick={() => router.refresh()}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center mt-32 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 text-neutral-200 dark:text-neutral-700 mb-4">
            <path fillRule="evenodd" d="M11.622 1.602a.75.75 0 01.756 0l2.25 1.313a.75.75 0 01-.756 1.295L12 3.118l-1.872 1.092a.75.75 0 11-.756-1.295l2.25-1.313zM5.898 5.81a.75.75 0 01-.27 1.025l-1.14.665 1.14.665a.75.75 0 11-.756 1.295L3.75 8.806v.944a.75.75 0 01-1.5 0V7.5a.75.75 0 01.372-.648l2.25-1.312a.75.75 0 011.026.27zm12.204 0a.75.75 0 011.026-.27l2.25 1.312a.75.75 0 01.372.648v2.25a.75.75 0 01-1.5 0v-.944l-1.122.654a.75.75 0 11-.756-1.295l1.14-.665-1.14-.665a.75.75 0 01-.27-1.025z" clipRule="evenodd" />
          </svg>
          <h2 className="text-base font-medium text-neutral-800 dark:text-white">No servers yet</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {user.isAdmin ? (
              <Link href="/admin/servers/create" className="text-blue-500">Create one now</Link>
            ) : canCreateServer ? (
              <Link href="/create-server" className="text-blue-500">Create your first server</Link>
            ) : (
              'An admin will assign one to you.'
            )}
          </p>
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">Folders</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} servers={allServers} onOpen={setOpenFolder} />
            ))}
          </div>
        </div>
      )}

      {/* Servers */}
      {servers.length > 0 && (
        <>
          {folders.length > 0 && (
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">Servers</p>
          )}
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
            {servers.map((server) => (
              <ServerCard key={server.UUID} server={server} view={view} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {currentPage > 1 && (
                <Link
                  href={`/dashboard?page=${currentPage - 1}`}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-neutral-500">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/dashboard?page=${currentPage + 1}`}
                  className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-white/10 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {/* New folder dialog */}
      {showNewFolder && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowNewFolder(false)}
        >
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/8 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">New folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full border border-neutral-200 dark:border-white/10 rounded-xl bg-neutral-50 dark:bg-white/4 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNewFolder(false)}
                className="px-4 py-2 text-sm text-neutral-500 border border-neutral-200 dark:border-white/10 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-4 py-2 text-sm bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition disabled:opacity-50"
              >
                {creatingFolder ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder popup */}
      {openFolder && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpenFolder(null)}
        >
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/8 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500">
                  <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
                </svg>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{openFolder.name}</h3>
              </div>
              <button onClick={() => setOpenFolder(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {folderServers.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-8">No servers in this folder.</p>
              ) : (
                folderServers.map((s) => <ServerCard key={s.UUID} server={s} view="list" />)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
