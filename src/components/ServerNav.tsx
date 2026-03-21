'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  serverId: string;
  serverName: string;
  features: string[];
  suspended: boolean;
}

export default function ServerNav({ serverId, serverName, features, suspended }: Props) {
  const pathname = usePathname();
  const base = `/server/${serverId}`;

  function isActive(href: string) {
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  const tabs = [
    { href: base, label: 'Console' },
    { href: `${base}/files`, label: 'Files' },
    { href: `${base}/backups`, label: 'Backups' },
    ...(features.includes('players') ? [{ href: `${base}/players`, label: 'Players' }] : []),
    ...(features.includes('worlds') ? [{ href: `${base}/worlds`, label: 'Worlds' }] : []),
    { href: `${base}/startup`, label: 'Startup' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  return (
    <div className="border-b border-neutral-200 dark:border-white/5 px-6 lg:px-12 pb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-medium text-neutral-800 dark:text-white truncate">
            {serverName}
          </h1>
          {suspended && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 shrink-0">
              Suspended
            </span>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 ${
              isActive(tab.href)
                ? 'text-neutral-900 dark:text-white border-neutral-900 dark:border-white'
                : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
