import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import FilesClient from './FilesClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path?: string }>;
}

export default async function FilesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  await requireServerAccess(id);

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true },
  });
  if (!server) notFound();

  return (
    <FilesClient
      serverId={id}
      currentPath={sp.path || '/'}
      nodeAddress={server.node.address}
      nodePort={server.node.port}
    />
  );
}
