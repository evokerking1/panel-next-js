'use client'

import { useState, useEffect, use } from 'react'
import PanelLayout from '@/components/layout/PanelLayout'
import ServerHeader from '@/components/server/ServerHeader'
import ServerTabs from '@/components/server/ServerTabs'
import Modal from '@/components/ui/Modal'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'

interface World { name: string; type: string }

interface ServerInfo {
  UUID: string
  name: string
  description?: string
  Suspended: boolean
  Installing: boolean
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
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown')
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/server/${uuid}`)
      .then(r => r.json())
      .then(d => {
        if (d.server) {
          setServer(d.server)
          setStatus(d.serverStatus?.online ? 'running' : 'stopped')
        }
      })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    fetch(`/api/server/${uuid}/worlds`)
      .then(r => r.json())
      .then(d => {
        setWorlds(d.worlds || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [uuid])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    showToast(`Deleting world ${deleteTarget}…`, 'info')
    try {
      const res = await fetch(`/api/server/${uuid}/files?action=delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: deleteTarget }),
      })
      if (res.ok) {
        setWorlds(prev => prev.filter(w => w.name !== deleteTarget))
        showToast(`World ${deleteTarget} deleted.`, 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to delete world.', 'error')
      }
    } catch {
      showToast('Failed to delete world.', 'error')
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (loading || !server) return (
    <PanelLayout>
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </PanelLayout>
  )

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8">
        <div className="mb-4">
          <ServerHeader name={server.name} description={server.description} status={status} />
        </div>
        <ServerTabs uuid={uuid} features={['players', 'worlds']} />

        <div className="mt-6">
          {worlds.length === 0 ? (
            <div className="bg-neutral-100 dark:bg-neutral-500/20 border border-neutral-200 dark:border-transparent p-4 rounded-xl flex items-start space-x-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mt-1 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-neutral-800 dark:text-white font-medium">No worlds found</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No Minecraft worlds were detected on this server. Worlds will appear here once they are created.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden shadow rounded-lg border border-neutral-200 dark:border-neutral-800/20 bg-white dark:bg-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Name</th>
                    <th className="py-3.5 pl-6 pr-3 text-left text-sm font-medium text-neutral-800 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                  {worlds.map(world => (
                    <tr key={world.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                        <div className="flex items-center">
                          <img
                            className="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-600 mr-5 shrink-0"
                            src={worldIcon(world.name)}
                            alt="World icon"
                          />
                          <div>
                            <div className="font-medium text-neutral-800 dark:text-white">{world.name}</div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">Minecraft World</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <button
                          onClick={() => setDeleteTarget(world.name)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-red-500 transition-colors inline-flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
