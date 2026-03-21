import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/prisma';
import AdminCreateServerClient from './AdminCreateServerClient';

export const dynamic = 'force-dynamic';

export default async function AdminCreateServerPage() {
  await requireAdmin();

  const [nodes, images, users] = await Promise.all([
    prisma.node.findMany({ orderBy: { name: 'asc' } }),
    prisma.images.findMany({ orderBy: { name: 'asc' } }),
    prisma.users.findMany({ orderBy: { username: 'asc' } }),
  ]);

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <AdminCreateServerClient
        nodes={nodes.map((n) => ({ id: n.id, name: n.name, address: n.address, allocatedPorts: n.allocatedPorts ?? '' }))}
        images={images.map((i) => ({
          id: i.id, name: i.name ?? '',
          dockerImages: i.dockerImages ?? '[]',
          variables: i.variables ?? '[]',
          startup: i.startup ?? '',
        }))}
        users={users.map((u) => ({ id: u.id, username: u.username ?? u.email }))}
      />
    </div>
  );
}
