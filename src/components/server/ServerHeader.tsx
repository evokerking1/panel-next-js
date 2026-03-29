'use client'

interface ServerHeaderProps {
  name: string
  description?: string
  status?: 'running' | 'stopped' | 'starting' | 'stopping' | 'unknown'
  uptime?: string
}

const statusConfig = {
  running:  { color: 'bg-green-500',   ping: 'bg-green-400',  label: '' },
  stopped:  { color: 'bg-red-500',     ping: null,             label: 'Offline' },
  starting: { color: 'bg-yellow-500',  ping: 'bg-yellow-400', label: 'Starting' },
  stopping: { color: 'bg-orange-500',  ping: 'bg-orange-400', label: 'Stopping' },
  unknown:  { color: 'bg-neutral-400', ping: null,             label: 'Unknown' },
}

export default function ServerHeader({ name, description, status = 'stopped', uptime }: ServerHeaderProps) {
  const cfg = statusConfig[status]
  const displayLabel = status === 'running' ? (uptime ? `Uptime: ${uptime}` : 'Online') : cfg.label

  return (
    <div>
      <div className="flex items-center">
        <h1 className="text-base font-medium leading-6 text-neutral-800 dark:text-white">
          {name.charAt(0).toUpperCase() + name.slice(1)}
        </h1>
        <div className="ml-3">
          <div className="flex items-center px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm">
            <span className="relative flex h-2 w-2 mr-2">
              {cfg.ping && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.ping} opacity-75`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.color}`} />
            </span>
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{displayLabel}</span>
          </div>
        </div>
      </div>
      {description && (
        <p className="tracking-tight text-sm text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>
      )}
    </div>
  )
}

// ~ https://github.com/thavanish made this shitty code
