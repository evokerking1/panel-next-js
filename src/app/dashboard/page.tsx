'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp, AnimatedList, AnimatePresence, LayoutGroup } from '@/components/ui/Animate'
import { Loader2, Trash2, LayoutGrid, List, Plus, FolderPlus, Server, Folder, X } from 'lucide-react'

interface Server {
  UUID: string
  name: string
  description?: string
  Memory: number
  Cpu: number
  Storage: number
  Ports: string
  Suspended: boolean
  Installing: boolean
  status?: 'running' | 'stopped' | 'unknown'
  ramUsage?: string
  cpuUsage?: string
  ramUsed?: string
  node: { id: number; name: string; address: string }
  owner: { username: string; avatar?: string }
}

interface FolderData {
  id: number
  name: string
  members: { serverUUID: string }[]
}

type ViewMode = 'grid' | 'list'

function StatusBadge({ status }: { status?: string }) {
  const running = status === 'running'
  const unknown = status === 'unknown'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md shrink-0 ${
      running ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
      : unknown ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700'
      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
    }`}>
      <span className="relative flex h-1.5 w-1.5">
        {running && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${running ? 'bg-emerald-500' : unknown ? 'bg-neutral-400' : 'bg-rose-500'}`} />
      </span>
      {running ? 'Running' : unknown ? 'Unknown' : 'Stopped'}
    </span>
  )
}

function ServerCard({ server, onDragStart }: { server: Server; onDragStart: (uuid: string, name: string, e: React.DragEvent) => void }) {
  const avatarSrc = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(server.owner.username)}`
  return (
    <div className="group relative bg-white dark:bg-neutral-800/20 rounded-xl border border-neutral-200 dark:border-white/5 shadow-sm p-4 hover:border-neutral-300 dark:hover:border-white/10 hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing"
      draggable onDragStart={e => onDragStart(server.UUID, server.name, e)}>
      <Link href={`/server/${server.UUID}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1 mr-3">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">{server.name}</h3>
            {server.description
              ? <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{server.description}</p>
              : <p className="text-xs text-neutral-400 mt-0.5 truncate italic">No description</p>}
          </div>
          <StatusBadge status={server.status} />
        </div>
        <div className="flex gap-3 mb-3">
          {[
            { label: 'RAM', value: `${server.ramUsage ?? '0'}%` },
            { label: 'CPU', value: `${server.cpuUsage ?? '0'}%` },
            { label: 'Used', value: server.ramUsed ?? '0MB' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 bg-neutral-100 dark:bg-neutral-700/30 rounded-lg px-3 py-2">
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">{stat.label}</p>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 min-w-0">
            <img className="h-4 w-4 rounded-full shrink-0" src={avatarSrc} alt="" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{server.owner.username}</span>
          </div>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">{server.node.name}</span>
        </div>
      </Link>
    </div>
  )
}

function FolderCard({ folder, onDrop, onClick }: { folder: FolderData; onDrop: (id: number) => void; onClick: (f: FolderData) => void }) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 cursor-pointer select-none border transition-all ${
        dragOver
          ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-500/8 shadow-[0_0_0_2px_rgba(245,158,11,0.25)]'
          : 'bg-neutral-50 dark:bg-white/[0.03] border-neutral-200 dark:border-white/[0.07] hover:bg-neutral-100 dark:hover:bg-white/[0.06]'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(folder.id) }}
      onClick={() => onClick(folder)}>
      <Folder className="h-5 w-5 text-amber-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{folder.name}</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{folder.members.length} server{folder.members.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

function DashboardInner() {
  const { user } = useAuth({ require: true })
  const { showToast } = useToastContext()
  const [view, setView] = useState<ViewMode>('grid')
  const [servers, setServers] = useState<Server[]>([])
  const [folders, setFolders] = useState<FolderData[]>([])
  const [loading, setLoading] = useState(true)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [activeFolder, setActiveFolder] = useState<FolderData | null>(null)
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(false)
  const dragUUID = useRef<string | null>(null)
  const dragName = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/servers').then(r => r.json()),
      fetch('/api/user/folders').then(r => r.json()),
    ]).then(([sd, fd]) => {
      setServers(sd.servers || [])
      setFolders(fd.folders || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const serversNotInFolder = servers.filter(s =>
    !folders.some(f => f.members.some(m => m.serverUUID === s.UUID))
  )

  function handleDragStart(uuid: string, name: string) {
    dragUUID.current = uuid
    dragName.current = name
  }

  function handleDragStartWithGhost(uuid: string, name: string, e: React.DragEvent) {
    dragUUID.current = uuid
    dragName.current = name
    e.dataTransfer.effectAllowed = 'move'

    const isDark = document.documentElement.classList.contains('dark')
    const ghost = document.createElement('div')
    ghost.id = 'drag-ghost'
    ghost.textContent = name
    ghost.style.cssText = `
      position:fixed;z-index:9999;pointer-events:none;
      background:${isDark ? '#262626' : 'white'};
      border:1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5e5'};
      border-radius:12px;padding:10px 14px;font-size:13px;font-weight:500;
      color:${isDark ? '#e5e5e5' : '#171717'};
      box-shadow:0 8px 24px rgba(0,0,0,0.18);
      transform:rotate(2deg);opacity:0.95;
      max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    `
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(new Image(), 0, 0)

    function move(ev: MouseEvent) {
      ghost.style.left = ev.clientX + 12 + 'px'
      ghost.style.top = ev.clientY + 12 + 'px'
    }
    document.addEventListener('mousemove', move)

    const cleanup = () => {
      ghost.remove()
      document.removeEventListener('mousemove', move)
      document.removeEventListener('dragend', cleanup)
    }
    document.addEventListener('dragend', cleanup)
  }

  async function handleDropOnFolder(folderId: number) {
    const uuid = dragUUID.current
    const name = dragName.current
    if (!uuid) return
    dragUUID.current = null
    dragName.current = null

    const already = folders.find(f => f.id === folderId)?.members.some(m => m.serverUUID === uuid)
    if (already) return

    const res = await fetch(`/api/user/folders/${folderId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverUUID: uuid }),
    })
    if (res.ok) {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, members: [...f.members, { serverUUID: uuid }] } : f))
      showToast(`"${name}" added to folder.`, 'success')
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    const res = await fetch('/api/user/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const d = await res.json()
    if (res.ok && d.folder) {
      setFolders(prev => [...prev, d.folder])
      setNewFolderName('')
      setNewFolderOpen(false)
      showToast(`Folder "${name}" created.`, 'success')
    }
  }

  async function handleDeleteFolder() {
    if (!activeFolder) return
    const res = await fetch(`/api/user/folders/${activeFolder.id}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(prev => prev.filter(f => f.id !== activeFolder.id))
      setActiveFolder(null)
      showToast('Folder deleted.', 'success')
    }
  }

  async function removeFromFolder(serverUUID: string) {
    if (!activeFolder) return
    const res = await fetch(`/api/user/folders/${activeFolder.id}/members/${serverUUID}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, members: f.members.filter(m => m.serverUUID !== serverUUID) } : f))
      setActiveFolder(prev => prev ? { ...prev, members: prev.members.filter(m => m.serverUUID !== serverUUID) } : null)
      showToast('Removed from folder.', 'success')
    }
  }

  const folderPopupServers = activeFolder
    ? servers.filter(s => activeFolder.members.some(m => m.serverUUID === s.UUID))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-6 w-6 text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
      <FadeUp>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Servers</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Manage and monitor your servers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!user?.isAdmin && (
            <Link href="/create-server" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">
              <Plus className="h-4 w-4" />
              New server
            </Link>
          )}
          <button onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
            <FolderPlus className="h-4 w-4" />
            New folder
          </button>
          {servers.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl border border-neutral-200 dark:border-white/5">
              {(['grid', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all ${view === v ? 'bg-white dark:bg-white/[0.08] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {v === 'grid'
                    ? <LayoutGrid className="h-4 w-4" />
                    : <List className="h-4 w-4" />}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </FadeUp>

      {servers.length === 0 && folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-center">
          <Server className="h-16 w-16 text-neutral-200 dark:text-neutral-700 mb-4" />
          <h2 className="text-base font-medium text-neutral-800 dark:text-white">No servers yet</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {!user?.isAdmin
              ? <><Link href="/create-server" className="text-blue-500 hover:underline">Create one</Link> to get started.</>
              : 'Servers you manage will appear here.'}
          </p>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">Folders</p>
              <AnimatedList className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {folders.map(f => <FolderCard key={f.id} folder={f} onDrop={handleDropOnFolder} onClick={setActiveFolder} />)}
              </AnimatedList>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">Drag a server onto a folder to add it</p>
            </div>
          )}

          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">Servers</p>

          <LayoutGroup>
          {view === 'grid' ? (
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {serversNotInFolder.map(s => <ServerCard key={s.UUID} server={s} onDragStart={handleDragStartWithGhost} />)}
            </AnimatedList>
          ) : (
            <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-x-auto shadow-sm mb-6">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-white/5">
                <thead className="bg-neutral-50 dark:bg-neutral-800/20">
                  <tr>{['Server', 'Status', 'Owner', 'RAM', 'CPU'].map(h => (
                    <th key={h} className="py-3 pl-6 pr-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5 bg-white dark:bg-transparent">
                  {serversNotInFolder.map(s => (
                    <tr key={s.UUID} onClick={() => window.location.href = `/server/${s.UUID}`}
                      className="hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                      <td className="py-3.5 pl-6 pr-3">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.name}</p>
                        {s.description && <p className="text-xs text-neutral-500 truncate max-w-xs">{s.description}</p>}
                      </td>
                      <td className="px-3 py-3.5"><StatusBadge status={s.status} /></td>
                      <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.owner.username}</td>
                      <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.ramUsage ?? '0'}%</td>
                      <td className="px-3 py-3.5 text-sm text-neutral-600 dark:text-neutral-300">{s.cpuUsage ?? '0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </LayoutGroup>
        </>
      )}

      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-[14px] w-full max-w-[380px] p-[22px]">
            <p className="text-sm font-semibold text-neutral-800 dark:text-white mb-1">New folder</p>
            <p className="text-xs text-neutral-500 mb-4">Give it a name. Drag server cards onto it to add servers.</p>
            <input autoFocus type="text" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderOpen(false) }}
              className="w-full border border-neutral-200 dark:border-white/[0.10] rounded-[9px] bg-neutral-50 dark:bg-white/[0.04] px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 mb-4 transition"
              placeholder="e.g. Game Servers" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNewFolderOpen(false)} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-neutral-500 border border-neutral-200 dark:border-white/[0.10] hover:bg-neutral-50 dark:hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleCreateFolder} className="px-4 py-2 rounded-[9px] text-[13px] font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition">Create</button>
            </div>
          </div>
        </div>
      )}

      {activeFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setActiveFolder(null) }}>
          <div className="bg-white dark:bg-[#1c1c1c] border border-neutral-200 dark:border-white/[0.08] rounded-2xl w-full max-w-[440px] max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-white/5 shrink-0">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-white">{activeFolder.name}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setDeleteFolderConfirm(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-red-400 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setActiveFolder(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {folderPopupServers.length === 0
                ? <p className="text-sm text-neutral-400">Empty — drag a server card here.</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {folderPopupServers.map(s => (
                      <div key={s.UUID} className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-white/5 rounded-xl px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700/40 transition">
                        <Link href={`/server/${s.UUID}`} className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-neutral-800 dark:text-white truncate">{s.name}</span>
                          <StatusBadge status={s.status} />
                        </Link>
                        <button onClick={() => removeFromFolder(s.UUID)} className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        </div>
      )}

      <Modal open={deleteFolderConfirm} title="Delete folder?"
        body="Servers inside will stay accessible — they just won't be in this folder."
        confirmLabel="Delete" danger
        onConfirm={handleDeleteFolder}
        onClose={() => setDeleteFolderConfirm(false)} />
    </div>
  )
}

export default function DashboardPage() {
  return <PanelLayout><DashboardInner /></PanelLayout>
}
