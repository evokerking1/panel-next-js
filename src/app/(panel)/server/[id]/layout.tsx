import { requireServerAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ServerNav from '@/components/ServerNav';
import { notFound } from 'next/navigation';

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ServerLayout({ children, params }: Props) {
  const { id } = await params;
  await requireServerAccess(id);

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true, image: true },
  });

  if (!server) notFound();

  const imageInfo = (() => {
    try {
      return typeof server.image?.info === 'string'
        ? JSON.parse(server.image.info)
        : server.image?.info ?? {};
    } catch {
      return {};
    }
  })();

  const features: string[] = Array.isArray(imageInfo?.features) ? imageInfo.features : [];

  return (
    <div className="pt-16" id="server-page-body">
      <ServerNav
        serverId={id}
        serverName={server.name}
        features={features}
        suspended={server.Suspended}
      />
      <div className="px-6 lg:px-12 pb-8 pt-4">
        {children}
      </div>
    </div>
  );
}
