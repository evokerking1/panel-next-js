'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function CreateNodePage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '127.0.0.1',
    port: '3001',
    sftpPort: '3003',
    ram: '',
    cpu: '',
    disk: '',
  })

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        address: form.address,
        port: form.port,
        sftpPort: form.sftpPort,
        ram: form.ram,
        cpu: form.cpu,
        disk: form.disk,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      showToast('Node created.', 'success')
      router.push('/admin/nodes')
    } else {
      showToast(d.error || 'Failed to create node.', 'error')
      setCreating(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none focus:border-neutral-400 dark:focus:border-white/25 transition'

  return (
    <PanelLayout>
      <div className="px-4 sm:px-8 md:px-12 pt-6 pb-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/nodes" className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-medium text-neutral-800 dark:text-white">Create node</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Add a new daemon node to the panel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Node details</h2>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Name</label>
                <input type="text" required placeholder="Node 1" value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Address</label>
                  <input type="text" required placeholder="127.0.0.1" value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5">Daemon port</label>
                  <input type="number" required placeholder="3001" value={form.port} onChange={e => set('port', e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">SFTP port</label>
                <input type="number" required placeholder="3003" value={form.sftpPort} onChange={e => set('sftpPort', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-sm font-medium text-neutral-800 dark:text-white">Resource limits</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Total resources available on this node.</p>
            </div>
            <div className="px-5 py-5 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">RAM (MB)</label>
                <input type="number" required placeholder="8192" value={form.ram} onChange={e => set('ram', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">CPU (%)</label>
                <input type="number" required placeholder="400" value={form.cpu} onChange={e => set('cpu', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1.5">Disk (GB)</label>
                <input type="number" required placeholder="100" value={form.disk} onChange={e => set('disk', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:opacity-60 transition">
              {creating ? 'Creating…' : 'Create node'}
            </button>
            <Link href="/admin/nodes"
              className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </PanelLayout>
  )
}
