import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import BackupsClient from './BackupsClient';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function BackupsPage({ params }: Props) {
  const { id } = await params;
  await requireServerAccess(id);

  const server = await prisma.server.findUnique({ where: { UUID: id } });
  if (!server) notFound();

  const backups = await prisma.backup.findMany({
    where: { serverId: id },
    orderBy: { createdAt: 'desc' },
  });

  const serialized = backups.map((b) => ({
    ...b,
    size: b.size?.toString() ?? '0',
  }));

  return <BackupsClient serverId={id} backups={serialized} />;
}
