import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function ServerSettingsPage({ params }: Props) {
  const { id } = await params;
  const { user } = await requireServerAccess(id);

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true, image: true },
  });
  if (!server) notFound();

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <SettingsClient
      server={{
        UUID: server.UUID,
        name: server.name,
        description: server.description ?? '',
        Memory: server.Memory,
        Cpu: server.Cpu,
        Storage: server.Storage,
        Suspended: server.Suspended,
        allowStartupEdit: server.allowStartupEdit,
        ownerId: server.ownerId,
      }}
      allowDelete={settings?.allowUserDeleteServer ?? false}
      isAdmin={user.isAdmin}
    />
  );
}
