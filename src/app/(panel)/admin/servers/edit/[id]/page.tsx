import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AdminEditServerClient from './AdminEditServerClient';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function AdminEditServerPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const serverId = parseInt(id, 10);

  const [server, nodes, images, users] = await Promise.all([
    prisma.server.findUnique({ where: { id: serverId }, include: { node: true, image: true, owner: true } }),
    prisma.node.findMany({ orderBy: { name: 'asc' } }),
    prisma.images.findMany({ orderBy: { name: 'asc' } }),
    prisma.users.findMany({ orderBy: { username: 'asc' } }),
  ]);

  if (!server) notFound();

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <AdminEditServerClient
        server={{
          id: server.id,
          UUID: server.UUID,
          name: server.name,
          description: server.description ?? '',
          nodeId: server.nodeId,
          imageId: server.imageId,
          ownerId: server.ownerId,
          Memory: server.Memory,
          Cpu: server.Cpu,
          Storage: server.Storage,
          StartCommand: server.StartCommand ?? '',
          Suspended: server.Suspended,
          allowStartupEdit: server.allowStartupEdit,
        }}
        nodes={nodes.map((n) => ({ id: n.id, name: n.name }))}
        images={images.map((i) => ({ id: i.id, name: i.name ?? '' }))}
        users={users.map((u) => ({ id: u.id, username: u.username ?? u.email }))}
      />
    </div>
  );
}
