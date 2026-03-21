import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PageTitle from '@/components/PageTitle';
import ApiKeysClient from './ApiKeysClient';

export const dynamic = 'force-dynamic';

export default async function AdminApiKeysPage() {
  await requireAdmin();

  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="API Keys" subtitle="Manage API keys for panel access." />
      <ApiKeysClient
        keys={keys.map((k) => ({
          id: k.id,
          name: k.name,
          key: k.key,
          description: k.description ?? '',
          permissions: k.permissions,
          active: k.active,
          createdAt: k.createdAt.toISOString(),
          owner: k.user?.username ?? k.user?.email ?? null,
        }))}
        hashed={settings?.hashApiKeys ?? false}
      />
    </div>
  );
}
