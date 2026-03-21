import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminServersPage() {
  await requireAdmin();

  const servers = await prisma.server.findMany({
    include: { node: true, owner: true },
    orderBy: { id: 'asc' },
  });

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Servers" subtitle="All servers across all nodes." />
        <Link
          href="/admin/servers/create"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New server
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden md:table-cell">Owner</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden lg:table-cell">Node</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.UUID} className="border-b border-neutral-100 dark:border-white/3 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-neutral-800 dark:text-white">{s.name}</p>
                  <p className="text-xs text-neutral-400 font-mono">{s.UUID.slice(0, 8)}</p>
                </td>
                <td className="px-5 py-3 text-neutral-500 hidden md:table-cell">{s.owner.username}</td>
                <td className="px-5 py-3 text-neutral-500 hidden lg:table-cell">{s.node.name}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.Suspended ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                    s.Installing ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    'bg-neutral-100 dark:bg-white/5 text-neutral-500'
                  }`}>
                    {s.Suspended ? 'Suspended' : s.Installing ? 'Installing' : 'Active'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/server/${s.UUID}`} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">Console</Link>
                    <Link href={`/admin/servers/edit/${s.id}`} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">Edit</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
