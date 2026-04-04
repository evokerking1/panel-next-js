'use client'

import { useState, useEffect, use, useRef } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import InstallBanner from '@/components/server/InstallBanner'
import Modal from '@/components/ui/Modal'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Info, Trash2, Download, Upload } from 'lucide-react'

interface World {
  name: string
  type: string
}

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
  Queued: boolean
}

function worldIcon(name: string): string {
  if (name === 'world') return '/assets/world_icons/overworld.png'
  if (name === 'world_nether' || name.includes('nether')) return '/assets/world_icons/nether.png'
  if (name === 'world_the_end' || name.includes('end')) return '/assets/world_icons/end.png'
  return '/assets/world_icons/overworld.png'
}

export default function WorldsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params)
  useAuth({ require: true })
  const { showToast } = useToastContext()

  const [server, setServer] = useState<ServerInfo | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [installing, setInstalling] = useState(false)
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStatus(d.serverStatus?.online ? 'running' : 'stopped')
        }
        if (d.features) setFeatures(d.features)
        setInstalling(!d.installed && !d.failed)
      })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    fetch(`/api/server/${uuid}/worlds`)
      .then(r => r.json())
      .then(d => setWorlds(d.worlds || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/server/${uuid}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path: `/${deleteTarget}` }),
      })
      if (res.ok) {
        setWorlds(prev => prev.filter(world => world.name !== deleteTarget))
        showToast(`World "${deleteTarget}" deleted.`, 'success')
      } else {
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to delete world.', 'error')
      }
    } catch {
      showToast('Failed to delete world.', 'error')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  function downloadWorld(worldName: string) {
    window.location.href = `/api/server/${uuid}/files?action=download&filePath=${encodeURIComponent(`/${worldName}`)}`
  }

  async function uploadWorldArchive(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return

    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('uploadPath', '/')
      const res = await fetch(`/api/server/${uuid}/files`, { method: 'POST', body: fd })
      if (res.ok) showToast(`${file.name} uploaded.`, 'success')
      else showToast(`Failed to upload ${file.name}.`, 'error')
    }

    if (uploadRef.current) uploadRef.current.value = ''
  }

  if (loading || !server) {
    return (
      <PanelLayout>
        <div className="animate-fade-in-up px-4 py-5 lg:px-8">
          <div className="space-y-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3">
                <div className="skeleton h-4 w-40 mb-2" />
                <div className="skeleton h-3 w-24 mb-3" />
                <div className="flex gap-2">
                  <div className="skeleton h-9 w-24" />
                  <div className="skeleton h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PanelLayout>
    )
  }

  return (
    <PanelLayout>
      <div className="animate-fade-in-up px-4 py-5 lg:px-8 lg:pt-4">
        <ServerHeader name={server.name} description={server.description} status={status} />
      </div>
      <ServerTabs uuid={uuid} features={features} />
      <InstallBanner uuid={uuid} installing={installing} />

      <div className="animate-fade-in-up px-4 pb-8 lg:px-8">
        {status === 'running' && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-800/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3 mb-4">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Stop the server before managing worlds.</p>
          </div>
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 mb-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">World archives</p>
            <p className="text-xs text-blue-600 dark:text-blue-400/70 mt-0.5">Download worlds directly or upload a world archive to the server root using the existing file API.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => uploadRef.current?.click()} className="rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Upload new world
          </button>
          <input ref={uploadRef} type="file" accept=".zip,.tar,.gz,.rar" className="hidden" onChange={uploadWorldArchive} />
        </div>

        {worlds.length === 0 ? (
          <div id="noWorldsMessage" className="rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-8 text-center mb-4">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No worlds found</p>
            <p className="text-xs text-neutral-500 mt-1">Worlds appear here once they are created on the server.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden shadow rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                  {worlds.map((world, index) => (
                    <tr key={world.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors animate-fade-in-up" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                        <div className="flex items-center">
                          <img className="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-600 mr-5 shrink-0" src={worldIcon(world.name)} alt="World icon" />
                          <div>
                            <div className="font-medium text-neutral-800 dark:text-white">{world.name}</div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">Minecraft World</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex gap-3">
                          <button onClick={() => downloadWorld(world.name)} className="rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          <button onClick={() => setDeleteTarget(world.name)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 hover:brightness-110 transition active:scale-[0.96] transition-transform duration-100 inline-flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden space-y-2">
              {worlds.map((world, index) => (
                <div key={world.name} className="animate-fade-in-up rounded-xl bg-neutral-50 dark:bg-neutral-800/20 border border-neutral-200 dark:border-white/5 px-4 py-3 flex items-center justify-between gap-3" style={{ animationDelay: `${Math.min(index * 0.04, 0.24)}s` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <img className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-600 shrink-0" src={worldIcon(world.name)} alt="World icon" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-white truncate">{world.name}</p>
                      <p className="text-xs text-neutral-500">Minecraft World</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => downloadWorld(world.name)} className="rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/40 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-[0.96] transition-transform duration-100">
                      Download
                    </button>
                    <button onClick={() => setDeleteTarget(world.name)} className="rounded-xl bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-medium text-white transition active:scale-[0.96] transition-transform duration-100">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        title="Delete World?"
        body={`Delete "${deleteTarget}"? All world data will be permanently lost and cannot be recovered.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete World'}
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </PanelLayout>
  )
}
