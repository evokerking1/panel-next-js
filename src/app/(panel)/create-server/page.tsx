import { requireAuthWithUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import CreateServerClient from './CreateServerClient';

export const dynamic = 'force-dynamic';

export default async function CreateServerPage() {
  const user = await requireAuthWithUser();
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.allowUserCreateServer) redirect('/dashboard');

  const nodes = await prisma.node.findMany({ orderBy: { id: 'asc' } });
  const images = await prisma.images.findMany({ orderBy: { name: 'asc' } });

  const serverLimit = user.serverLimit ?? settings?.defaultServerLimit ?? 0;
  if (serverLimit === 0) redirect('/dashboard');

  const serverCount = await prisma.server.count({ where: { ownerId: user.id } });
  if (serverCount >= serverLimit) redirect('/dashboard?err=SERVER_LIMIT_REACHED');

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Create server" subtitle="Deploy a new server instance." />
      <CreateServerClient
        nodes={nodes.map((n) => ({ id: n.id, name: n.name, address: n.address }))}
        images={images.map((i) => ({ id: i.id, name: i.name ?? '', description: i.description ?? '' }))}
        limits={{
          maxMemory: user.maxMemory ?? settings?.defaultMaxMemory ?? 512,
          maxCpu: user.maxCpu ?? settings?.defaultMaxCpu ?? 100,
          maxStorage: user.maxStorage ?? settings?.defaultMaxStorage ?? 5,
        }}
      />
    </div>
  );
}
