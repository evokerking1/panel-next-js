import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [userCount, nodeCount, serverCount, imageCount] = await Promise.all([
    prisma.users.count(),
    prisma.node.count(),
    prisma.server.count(),
    prisma.images.count(),
  ]);

  const config = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'storage/config.json'), 'utf-8')); }
    catch { return { meta: { version: 'unknown' } }; }
  })();

  const stats = [
    { label: 'Users', value: userCount, href: '/admin/users' },
    { label: 'Nodes', value: nodeCount, href: '/admin/nodes' },
    { label: 'Servers', value: serverCount, href: '/admin/servers' },
    { label: 'Images', value: imageCount, href: '/admin/images' },
  ];

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Overview" subtitle="A summary of your panel." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="rounded-xl border border-neutral-200 dark:border-white/5 p-5 bg-white dark:bg-white/[0.02] hover:bg-neutral-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            <p className="text-2xl font-semibold text-neutral-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-neutral-500 mt-1">{s.label}</p>
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 p-5 bg-white dark:bg-white/[0.02] max-w-md">
        <p className="text-xs font-medium text-neutral-500 mb-3">Panel version</p>
        <p className="text-sm font-mono text-neutral-800 dark:text-white">{config.meta.version}</p>
      </div>
    </div>
  );
}
