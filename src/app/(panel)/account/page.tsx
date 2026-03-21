import { requireAuthWithUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import AccountClient from './AccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireAuthWithUser();

  const [loginHistory, apiKeys] = await Promise.all([
    prisma.loginHistory.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 10,
    }),
    prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Account" subtitle="Manage your account settings." />
      <AccountClient
        user={{
          id: user.id,
          username: user.username ?? '',
          email: user.email,
          description: user.description ?? '',
          avatar: user.avatar ?? null,
          isAdmin: user.isAdmin,
        }}
        loginHistory={loginHistory.map((h) => ({
          id: h.id,
          ipAddress: h.ipAddress,
          userAgent: h.userAgent,
          timestamp: h.timestamp.toISOString(),
        }))}
        apiKeys={apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          key: k.key,
          active: k.active,
          createdAt: k.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
