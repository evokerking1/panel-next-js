'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import PanelLayout from '@/components/layout/PanelLayout'
import { useToastContext } from '@/components/layout/PanelLayout'
import { useAuth } from '@/hooks/useAuth'
import { FadeUp } from '@/components/ui/Animate'
import LoadingPopup from '@/components/ui/LoadingPopup'

const inputClass = "rounded-xl focus:ring focus:ring-neutral-800/10 focus:border-neutral-800/20 text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full hover:bg-white/5 px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 placeholder:text-neutral-950/50 dark:placeholder:text-white/20 border border-neutral-800/10 dark:border-white/5"
const selectClass = "rounded-xl text-neutral-800 dark:text-white text-sm mt-2 mb-4 w-full px-4 py-2 bg-neutral-400/10 dark:bg-neutral-600/20 border border-neutral-800/10 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-white/20"
const labelClass = "text-neutral-700 dark:text-neutral-400 text-sm tracking-tight mb-2"

interface NodeServer { Ports: string }
interface NodeData {
  id: number
  name: string
  address: string
  port: number
  allocatedPorts: string | null
  servers?: NodeServer[]
  instances?: NodeServer[]
}
interface ImageData {
  id: number
  name: string
  dockerImages: string | null
  variables: string | null
}
interface User { id: number; username: string }

interface Variable {
  name: string
  env_variable?: string
  env?: string
  field_type?: string
  type?: string
  default_value?: unknown
  value?: unknown
  description?: string
  rules?: string
  required?: boolean
}

const NAME_ADJECTIVES = [
  'Charged', 'Fiery', 'Mystical', 'Dark', 'Angry', 'Enchanted',
  'Blazing', 'Cursed', 'Frozen', 'Swift', 'Ancient', 'Wicked',
  'Luminous', 'Vengeful', 'Radiant', 'Thunderous', 'Shadow',
  'Frost', 'Vibrant', 'Spectral', 'Nether', 'Ender', 'Toxic', 'Haunted',
]

const NAME_NOUNS = [
  'Creeper', 'Dragon', 'Zombie', 'Ghoul', 'Enderman', 'Skeleton',
  'Wither', 'Magma Cube', 'Blaze', 'Witch', 'Slime', 'Spider',
  'Phantom', 'Pillager', 'Vindicator', 'Drowned', 'Ravager',
  'Piglin', 'Hoglin', 'Shulker', 'Warden',
]

function randomName() {
  const a = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)]
  const b = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)]
  return `${a} ${b}`
}

function getAvailablePorts(node: NodeData): number[] {
  let allocated: number[] = []
  try {
    allocated = JSON.parse(node.allocatedPorts || '[]')
  } catch {}

  const usedPorts = new Set<number>()
  for (const srv of node.instances || node.servers || []) {
    try {
      const ports = JSON.parse(srv.Ports || '[]')
      for (const p of ports) {
        const num = parseInt(String(p.Port).split(':')[0])
        if (!isNaN(num)) usedPorts.add(num)
      }
    } catch {}
  }

  return allocated.filter(p => !usedPorts.has(p))
}

function getDockerImageOptions(image: ImageData): { key: string; value: string }[] {
  try {
    const parsed = JSON.parse(image.dockerImages || '[]')
    const result: { key: string; value: string }[] = []
    for (const entry of parsed) {
      for (const [k, v] of Object.entries(entry)) {
        result.push({ key: k, value: String(v) })
      }
    }
    return result
  } catch {
    return []
  }
}

function getVariables(image: ImageData): Variable[] {
  try {
    return JSON.parse(image.variables || '[]')
  } catch {
    return []
  }
}

export default function AdminServerCreatePage() {
  useAuth({ require: true, adminOnly: true })
  const { showToast } = useToastContext()
  const router = useRouter()

  const [nodes, setNodes] = useState<NodeData[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [images, setImages] = useState<ImageData[]>([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [imageId, setImageId] = useState('')
  const [dockerImageKey, setDockerImageKey] = useState('')
  const [selectedPort, setSelectedPort] = useState('')
  const [cpu, setCpu] = useState('2')
  const [memory, setMemory] = useState('1024')
  const [storage, setStorage] = useState('20')
  const [allowStartupEdit, setAllowStartupEdit] = useState(false)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})

  const [popup, setPopup] = useState<{ open: boolean; message: string; state: 'loading' | 'done' | 'error' }>({
    open: false, message: '', state: 'loading',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/nodes').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/images').then(r => r.json()),
    ]).then(([nd, ud, id]) => {
      const nodeList: NodeData[] = nd.nodes || []
      const userList: User[] = ud.users || []
      const imageList: ImageData[] = id.images || []
      setNodes(nodeList)
      setUsers(userList)
      setImages(imageList)
      if (userList[0]) setOwnerId(String(userList[0].id))
      if (nodeList[0]) {
        setNodeId(String(nodeList[0].id))
        const ports = getAvailablePorts(nodeList[0])
        if (ports[0]) setSelectedPort(String(ports[0]))
      }
      if (imageList[0]) {
        setImageId(String(imageList[0].id))
        const dockerOpts = getDockerImageOptions(imageList[0])
        if (dockerOpts[0]) setDockerImageKey(dockerOpts[0].key)
        const vars = getVariables(imageList[0])
        const defaults: Record<string, string> = {}
        for (const v of vars) {
          const key = v.env_variable || v.env || ''
          defaults[key] = String(v.default_value ?? v.value ?? '')
        }
        setVariableValues(defaults)
      }
      setName(randomName())
    }).catch(() => showToast('Failed to load data', 'error'))
  }, [])

  const selectedNode = nodes.find(n => String(n.id) === nodeId) || null
  const selectedImage = images.find(i => String(i.id) === imageId) || null
  const availablePorts = selectedNode ? getAvailablePorts(selectedNode) : []
  const dockerOptions = selectedImage ? getDockerImageOptions(selectedImage) : []
  const variables = selectedImage ? getVariables(selectedImage) : []

  function handleNodeChange(id: string) {
    setNodeId(id)
    const node = nodes.find(n => String(n.id) === id)
    if (node) {
      const ports = getAvailablePorts(node)
      setSelectedPort(ports[0] ? String(ports[0]) : '')
    } else {
      setSelectedPort('')
    }
  }

  function handleImageChange(id: string) {
    setImageId(id)
    const img = images.find(i => String(i.id) === id)
    if (img) {
      const dockerOpts = getDockerImageOptions(img)
      setDockerImageKey(dockerOpts[0]?.key || '')
      const vars = getVariables(img)
      const defaults: Record<string, string> = {}
      for (const v of vars) {
        const key = v.env_variable || v.env || ''
        defaults[key] = String(v.default_value ?? v.value ?? '')
      }
      setVariableValues(defaults)
    } else {
      setDockerImageKey('')
      setVariableValues({})
    }
  }

  function setVar(key: string, val: string) {
    setVariableValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleCreate() {
    if (!name || !nodeId || !ownerId || !imageId || !selectedPort) {
      showToast('Fill in all required fields', 'error')
      return
    }
    if (!dockerImageKey) {
      showToast('Select a Docker image', 'error')
      return
    }

    const variablesArray = variables.map(v => {
      const key = v.env_variable || v.env || ''
      return {
        env_variable: key,
        env: key,
        name: v.name,
        value: variableValues[key] ?? String(v.default_value ?? v.value ?? ''),
        field_type: v.field_type || v.type || 'text',
      }
    })

    setPopup({ open: true, message: 'Sending configuration to daemon...', state: 'loading' })

    const res = await fetch('/api/admin/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        ownerId: parseInt(ownerId),
        nodeId: parseInt(nodeId),
        imageId: parseInt(imageId),
        Ports: selectedPort,
        Memory: parseInt(memory),
        Cpu: parseInt(cpu),
        Storage: parseInt(storage),
        dockerImage: dockerImageKey,
        variables: variablesArray,
        allowStartupEdit,
      }),
    })

    const d = await res.json()
    if (res.ok) {
      setPopup({ open: true, message: 'Server created and queued for install.', state: 'done' })
      setTimeout(() => { setPopup(p => ({ ...p, open: false })); router.push('/admin/servers') }, 1200)
    } else {
      setPopup({ open: true, message: d.error || 'Failed to create server', state: 'error' })
      showToast(d.error || 'Failed to create server', 'error')
    }
  }

  return (
    <PanelLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="sm:flex sm:items-center px-8 pt-4">
          <FadeUp className="sm:flex-auto">
            <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">Create Server</h1>
            <p className="mt-1 tracking-tight text-sm text-neutral-500">Deploy a new server on a node.</p>
          </FadeUp>
        </div>

        <FadeUp delay={0.06}>
          <div className="mt-6 px-8 w-full">
            <div className="bg-neutral-50 dark:bg-neutral-800/20 rounded-xl p-5 border border-neutral-200 dark:border-white/5">

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">General</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={labelClass}>Name:</label>
                  <div className="flex items-center gap-1">
                    <input
                      className={inputClass}
                      placeholder="Server name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setName(randomName())}
                      className="mb-4 mt-2 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                      title="Generate random name"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Description:</label>
                  <input
                    className={inputClass}
                    placeholder="Server description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>User:</label>
                  <select className={selectClass} value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Node:</label>
                  <select className={selectClass} value={nodeId} onChange={e => handleNodeChange(e.target.value)}>
                    <option value="">Select node</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.address})</option>)}
                  </select>
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Resources</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className={labelClass}>CPU (Cores):</label>
                  <input type="number" min="1" max="128" className={inputClass}
                    value={cpu} onChange={e => setCpu(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Memory (MB):</label>
                  <input type="number" min="128" max="131072" className={inputClass}
                    value={memory} onChange={e => setMemory(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Storage (GB):</label>
                  <input type="number" min="1" max="1000" className={inputClass}
                    value={storage} onChange={e => setStorage(e.target.value)} />
                </div>
              </div>

              <h2 className="text-neutral-700 dark:text-neutral-300 text-lg font-semibold mb-4">Startup</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={labelClass}>Image:</label>
                  <select className={selectClass} value={imageId} onChange={e => handleImageChange(e.target.value)}>
                    <option value="">Select image</option>
                    {images.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Docker Image:</label>
                  <select className={selectClass} value={dockerImageKey} onChange={e => setDockerImageKey(e.target.value)}>
                    <option value="">Select Docker image</option>
                    {dockerOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.key}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Port:</label>
                  {availablePorts.length === 0 ? (
                    <div className="mt-2 mb-4 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
                      {nodeId ? 'No available ports on this node.' : 'Select a node first.'}
                    </div>
                  ) : (
                    <select className={selectClass} value={selectedPort} onChange={e => setSelectedPort(e.target.value)}>
                      <option value="">Select port</option>
                      {availablePorts.map(p => (
                        <option key={p} value={p}>{selectedNode?.address}:{p}</option>
                      ))}
                    </select>
                  )}
                  {availablePorts.length > 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Only ports not already assigned to servers on this node are shown.
                    </p>
                  )}
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-700/20 rounded-lg p-4 border border-neutral-300 dark:border-white/5 self-end mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-neutral-800 dark:text-white">Startup Command Permissions</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Allow users to modify the startup command.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowStartupEdit}
                      onClick={() => setAllowStartupEdit(v => !v)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${allowStartupEdit ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${allowStartupEdit ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {variables.length > 0 && (
                <>
                  <h2 className="text-neutral-700 dark:text-neutral-300 text-md font-semibold mb-4">Variables</h2>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {variables.map(v => {
                      const key = v.env_variable || v.env || ''
                      const isRequired = v.rules ? v.rules.includes('required') : !!v.required
                      const fieldType = v.field_type || v.type || 'text'
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-neutral-700 dark:text-neutral-400 text-sm tracking-tight">
                            {v.name}{isRequired ? ' *' : ''}
                          </label>
                          {v.description && (
                            <p className="text-xs text-neutral-500 -mt-0.5">{v.description}</p>
                          )}
                          <input
                            type={fieldType === 'number' ? 'number' : 'text'}
                            className={inputClass}
                            placeholder={String(v.default_value ?? v.value ?? `Enter ${v.name}`)}
                            value={variableValues[key] ?? ''}
                            onChange={e => setVar(key, e.target.value)}
                            required={isRequired}
                          />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              <button
                onClick={handleCreate}
                type="button"
                className="rounded-xl bg-neutral-950 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-200 text-white dark:text-neutral-800 px-4 py-2 text-sm font-medium shadow-md transition"
              >
                Create Server
              </button>
            </div>
          </div>
        </FadeUp>

        <LoadingPopup
          open={popup.open}
          title="Creating Server"
          message={popup.message}
          state={popup.state}
          onHide={() => setPopup(p => ({ ...p, open: false }))}
        />
      </div>
    </PanelLayout>
  )
}
