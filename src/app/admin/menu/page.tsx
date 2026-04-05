'use client'

import { BarChart3, Box, ChevronRight, Key, LayoutDashboard, Network, Puzzle, Server, Settings, Users } from 'lucide-react'

import Link from 'next/link'
import PanelLayout from '@/components/layout/panel-layout'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const items = [
  {
    label: 'Overview',
    desc: 'Panel stats and activity',
    url: '/admin/overview',
    icon: <LayoutDashboard className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Settings',
    desc: 'Panel configuration',
    url: '/admin/settings',
    icon: <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Servers',
    desc: 'Manage all servers',
    url: '/admin/servers',
    icon: <Server className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Users',
    desc: 'Manage accounts',
    url: '/admin/users',
    icon: <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Nodes',
    desc: 'Daemon nodes',
    url: '/admin/nodes',
    icon: <Network className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Images',
    desc: 'Docker images',
    url: '/admin/images',
    icon: <Box className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Addons',
    desc: 'Extensions and plugins',
    url: '/admin/addons',
    icon: <Puzzle className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'API Keys',
    desc: 'Access tokens',
    url: '/admin/apikeys',
    icon: <Key className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
  {
    label: 'Analytics',
    desc: 'Server and node stats',
    url: '/admin/analytics',
    icon: <BarChart3 className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />,
  },
]

const chevron = (
  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
)

export default function AdminMenuPage() {
  const { user, loading } = useAuth({ require: true, adminOnly: true })
  const router = useRouter()

  useEffect(() => {
    if (!loading && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      router.replace('/admin/overview')
    }
  }, [loading, router])

  if (loading || !user) return null

  return (
    <PanelLayout>
      <div id="page-content" className="px-4 py-5">
        <div className="mb-5">
          <h1 className="text-base font-medium text-neutral-800 dark:text-white">Admin Panel</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Manage your panel</p>
        </div>

        <div className="space-y-2">
          {items.map(item => (
            <Link key={item.url} href={item.url}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/30 active:scale-[0.98] transition-transform duration-100">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700/50 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-white">{item.label}</p>
                <p className="text-xs text-neutral-500 truncate">{item.desc}</p>
              </div>
              {chevron}
            </Link>
          ))}
        </div>
      </div>
    </PanelLayout>
  )
}
