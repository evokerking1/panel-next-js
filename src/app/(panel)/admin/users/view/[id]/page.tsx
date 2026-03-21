import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import UserEditClient from './UserEditClient';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function AdminUserViewPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const userId = parseInt(id, 10);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { servers: true, loginHistory: { orderBy: { timestamp: 'desc' }, take: 10 } },
  });
  if (!user) notFound();

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <UserEditClient
        user={{
          id: user.id,
          username: user.username ?? '',
          email: user.email,
          isAdmin: user.isAdmin,
          description: user.description ?? '',
          serverLimit: user.serverLimit,
          maxMemory: user.maxMemory,
          maxCpu: user.maxCpu,
          maxStorage: user.maxStorage,
          servers: user.servers.map((s) => ({ UUID: s.UUID, name: s.name })),
          loginHistory: user.loginHistory.map((h) => ({
            id: h.id,
            ipAddress: h.ipAddress,
            userAgent: h.userAgent,
            timestamp: h.timestamp.toISOString(),
          })),
        }}
        defaultLimits={{
          serverLimit: settings?.defaultServerLimit ?? 0,
          maxMemory: settings?.defaultMaxMemory ?? 512,
          maxCpu: settings?.defaultMaxCpu ?? 100,
          maxStorage: settings?.defaultMaxStorage ?? 5,
        }}
      />
    </div>
  );
}
