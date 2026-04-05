'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PanelLayout from '@/components/layout/panel-layout'
import { useToastContext } from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/motion'
import LoadingPopup from '@/components/ui/loading-popup'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"

export default function AdminNodeCreatePage() {
  const { user } = useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [form, setForm] = useState({
    name: '', ram: '', disk: '', cpu: '', address: '', port: '3002',
  })
  const [popup, setPopup] = useState<{ open: boolean; message: string; state: 'loading' | 'done' | 'error' }>({
    open: false, message: '', state: 'loading',
  })

  function setField(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate() {
    if (!form.name || !form.address || !form.port) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setPopup({ open: true, message: 'Sending node configuration...', state: 'loading' })

    try {
      const res = await fetch('/api/admin/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setPopup({ open: true, message: 'Node created successfully!', state: 'done' })
        showToast('Node created successfully!', 'success')
        setTimeout(() => {
          setPopup(p => ({ ...p, open: false }))
          router.push('/admin/nodes')
        }, 1000)
      } else {
        const d = await res.json()
        setPopup({ open: true, message: d.error || 'Failed to create node', state: 'error' })
        showToast(d.error || 'Failed to create node', 'error')
      }
    } catch (err) {
      setPopup({ open: true, message: 'Network error', state: 'error' })
      showToast('Error creating node', 'error')
    }
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Create Node</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Add a new daemon node to the panel</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div id="nodeForm" className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label htmlFor="nodeName" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Name:</label>
                  <input id="nodeName" className={inputClass} placeholder="My node"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </div>

                <div>
                  <label htmlFor="nodeRam" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">RAM (MB):</label>
                  <input id="nodeRam" className={inputClass} placeholder="For information purposes only"
                    value={form.ram} onChange={e => setField('ram', e.target.value)} />
                </div>

                <div>
                  <label htmlFor="nodeDisk" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Disk (GB):</label>
                  <input id="nodeDisk" className={inputClass} placeholder="For information purposes only"
                    value={form.disk} onChange={e => setField('disk', e.target.value)} />
                </div>

                <div>
                  <label htmlFor="nodeProcessor" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">CPU:</label>
                  <input id="nodeProcessor" className={inputClass} placeholder="For information purposes only"
                    value={form.cpu} onChange={e => setField('cpu', e.target.value)} />
                </div>

                <div>
                  <label htmlFor="nodeAddress" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">IP Address:</label>
                  <input id="nodeAddress" className={inputClass} placeholder="localhost"
                    value={form.address} onChange={e => setField('address', e.target.value)} />
                </div>

                <div>
                  <label htmlFor="nodePort" className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2">Daemon Port:</label>
                  <input id="nodePort" className={inputClass} placeholder="3002"
                    value={form.port} onChange={e => setField('port', e.target.value)} />
                </div>

                <div className="col-span-2">
                  <button onClick={handleCreate} type="button"
                    className="w-full md:w-auto rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-300 text-neutral-200 dark:text-neutral-800 px-3 py-2 text-sm font-medium shadow-md transition">
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        <LoadingPopup
          open={popup.open}
          title="Creating Node"
          message={popup.message}
          state={popup.state}
          onHide={() => setPopup(p => ({ ...p, open: false }))}
        />
      </div>
    </PanelLayout>
  )
}
