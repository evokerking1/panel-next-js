import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerStatus } from '@/lib/serverStatus';
import { checkForServerInstallation } from '@/lib/serverInstall';
import { notFound } from 'next/navigation';
import ServerConsole from './ServerConsole';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ServerManagePage({ params }: Props) {
  const { id } = await params;
  const { user } = await requireServerAccess(id);

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true, image: true, owner: true },
  });

  if (!server) notFound();

  const serverStatus = await getServerStatus({
    nodeAddress: server.node.address,
    nodePort: server.node.port,
    serverUUID: server.UUID,
    nodeKey: server.node.key,
  });

  const installResult = await checkForServerInstallation(id);

  const ports = (() => {
    try { return JSON.parse(server.Ports); } catch { return []; }
  })();
  const primaryPort = ports.find((p: any) => p.primary)?.Port;

  const imageInfo = (() => {
    try { return typeof server.image?.info === 'string' ? JSON.parse(server.image.info) : server.image?.info ?? {}; } catch { return {}; }
  })();
  const features: string[] = Array.isArray(imageInfo?.features) ? imageInfo.features : [];

  return (
    <ServerConsole
      server={{
        UUID: server.UUID,
        name: server.name,
        description: server.description,
        Memory: server.Memory,
        Cpu: server.Cpu,
        Storage: server.Storage,
        Suspended: server.Suspended,
        Installing: server.Installing,
        Queued: server.Queued,
      }}
      node={{
        address: server.node.address,
        port: server.node.port,
      }}
      serverStatus={serverStatus}
      installed={installResult}
      features={features}
      primaryPort={primaryPort}
    />
  );
}
