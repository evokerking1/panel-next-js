import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import StartupClient from './StartupClient';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function StartupPage({ params }: Props) {
  const { id } = await params;
  await requireServerAccess(id);

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { image: true },
  });
  if (!server) notFound();

  const variables = (() => {
    try { return JSON.parse(server.Variables ?? '[]'); } catch { return []; }
  })();

  return (
    <StartupClient
      serverId={id}
      startCommand={server.StartCommand ?? ''}
      variables={variables}
      allowEdit={server.allowStartupEdit}
    />
  );
}
