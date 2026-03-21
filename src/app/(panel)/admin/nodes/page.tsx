import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import Link from 'next/link';
import { checkNodeStatus } from '@/lib/nodeStatus';

export const dynamic = 'force-dynamic';

export default async function AdminNodesPage() {
  await requireAdmin();

  const nodes = await prisma.node.findMany({ orderBy: { id: 'asc' } });
  const nodesWithStatus = await Promise.all(nodes.map((n) => checkNodeStatus(n)));

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Nodes" subtitle="Manage connected daemon nodes." />
        <Link
          href="/admin/nodes/create"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New node
        </Link>
      </div>

      {nodesWithStatus.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-neutral-500">No nodes configured yet.</p>
          <Link href="/admin/nodes/create" className="mt-3 text-sm text-blue-500 hover:underline">Add your first node</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {nodesWithStatus.map((node) => (
            <div key={node.id} className="rounded-xl border border-neutral-200 dark:border-white/5 p-5 bg-white dark:bg-white/[0.02]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${node.status === 'Online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-white">{node.name}</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{node.address}:{node.port}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/nodes/${node.id}/stats`} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">Stats</Link>
                  <Link href={`/admin/nodes/${node.id}/edit`} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">Edit</Link>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-neutral-500">
                <div><span className="text-neutral-400">RAM</span><br />{node.ram} MB</div>
                <div><span className="text-neutral-400">CPU</span><br />{node.cpu}%</div>
                <div><span className="text-neutral-400">Disk</span><br />{node.disk} GB</div>
              </div>
              {node.versionRelease && (
                <p className="text-xs text-neutral-400 mt-3 font-mono">v{node.versionRelease}</p>
              )}
              {node.error && (
                <p className="text-xs text-red-500 mt-2">{node.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
