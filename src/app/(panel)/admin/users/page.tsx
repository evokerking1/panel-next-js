import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.users.findMany({
    include: { servers: true },
    orderBy: { id: 'asc' },
  });

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Users" subtitle="Manage all users on the panel." />
        <Link
          href="/admin/users/create"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New user
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden sm:table-cell">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Role</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-neutral-500">Servers</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 dark:border-white/3 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={u.avatar ?? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.username ?? '')}`}
                      alt=""
                      className="h-7 w-7 rounded-lg shrink-0"
                    />
                    <div>
                      <p className="font-medium text-neutral-800 dark:text-white text-sm">{u.username}</p>
                      <p className="text-xs text-neutral-400">#{String(u.id).padStart(4, '0')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-neutral-500 hidden sm:table-cell">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isAdmin ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-neutral-100 dark:bg-white/5 text-neutral-500'}`}>
                    {u.isAdmin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-neutral-500">{u.servers.length}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/users/view/${u.id}`}
                    className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
