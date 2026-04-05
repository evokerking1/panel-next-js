import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkNodeOnline } from '@/lib/daemon';
import { requireAdminUser } from '@/lib/api/admin-auth';

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [userCount, nodeCount, instanceCount, imageCount, nodes, recentServers] = await Promise.all([
    prisma.users.count(),
    prisma.node.count(),
    prisma.server.count(),
    prisma.images.count(),
    prisma.node.findMany(),
    prisma.server.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { owner: { select: { username: true } } },
    }),
  ]);

  const nodeStatuses = await Promise.all(
    nodes.map(async node => ({
      id: node.id,
      name: node.name,
      address: node.address,
      port: node.port,
      online: await checkNodeOnline(node.address, node.port, node.key),
    }))
  );

  return NextResponse.json({
    userCount,
    nodeCount,
    instanceCount,
    imageCount,
    version: process.env.npm_package_version || '1.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    nodes: nodeStatuses,
    recentServers: recentServers.map(server => ({
      id: server.id,
      uuid: server.UUID,
      name: server.name,
      createdAt: server.createdAt,
      owner: server.owner?.username || '—',
    })),
  });
}
