import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [servers, users, nodes, images, loginHistory] = await Promise.all([
    prisma.server.findMany({ include: { image: { select: { id: true, name: true } }, owner: { select: { username: true } } } }),
    prisma.users.findMany({ select: { id: true, isAdmin: true } }),
    prisma.node.findMany(),
    prisma.images.findMany({ select: { id: true, name: true } }),
    prisma.loginHistory.findMany({
      orderBy: { timestamp: 'desc' },
      take: 200,
      select: { userId: true, ipAddress: true, timestamp: true },
    }),
  ]);

  const totalRamMb = servers.reduce((s: number, srv: { Memory: number }) => s + (srv.Memory ?? 0), 0);
  const totalCpuPct = servers.reduce((s: number, srv: { Cpu: number }) => s + (srv.Cpu ?? 0), 0);
  const totalStorageGb = servers.reduce((s: number, srv: { Storage: number }) => s + (srv.Storage ?? 0), 0);

  const imageCounts: Record<number, { name: string | null; count: number }> = {};
  images.forEach((img: { id: number; name: string | null }) => { imageCounts[img.id] = { name: img.name, count: 0 }; });
  servers.forEach((srv: { imageId: number }) => { if (imageCounts[srv.imageId]) imageCounts[srv.imageId].count++; });
  const topImages = Object.values(imageCounts)
    .sort((a, b) => b.count - a.count)
    .filter(i => i.count > 0)
    .slice(0, 6);

  const topServers = [...servers]
    .sort((a, b) => b.Memory - a.Memory)
    .slice(0, 6)
    .map(s => ({
      name: s.name,
      uuid: s.UUID,
      memory: s.Memory,
      cpu: s.Cpu,
      storage: s.Storage,
      owner: s.owner?.username ?? '—',
      image: s.image?.name ?? '—',
      suspended: s.Suspended,
    }));

  const nodeStatuses = await Promise.all(
    nodes.map(async (node: { id: number; name: string; address: string; port: number; key: string; ram: number; cpu: number; disk: number }) => {
      const serverCount = servers.filter((s: { nodeId: number }) => s.nodeId === node.id).length;
      try {
        const base = await import('@/lib/daemon').then(m => m.daemonUrl(node.address, node.port));
        const r = await axios.get(await base, {
          auth: { username: 'Airlink', password: node.key },
          timeout: 3000,
        });
        return {
          id: node.id, name: node.name, address: node.address, port: node.port,
          online: true, serverCount, ram: node.ram, cpu: node.cpu, disk: node.disk,
          versionRelease: r.data?.versionRelease ?? null,
        };
      } catch {
        return {
          id: node.id, name: node.name, address: node.address, port: node.port,
          online: false, serverCount, ram: node.ram, cpu: node.cpu, disk: node.disk,
        };
      }
    }),
  );

  const adminCount = users.filter((u: { isAdmin: boolean }) => u.isAdmin).length;
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const loginsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    loginsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  loginHistory
    .filter((l: { timestamp: Date }) => new Date(l.timestamp) >= last30Days)
    .forEach((l: { timestamp: Date }) => {
      const key = new Date(l.timestamp).toISOString().slice(0, 10);
      if (loginsByDay[key] !== undefined) loginsByDay[key]++;
    });

  return NextResponse.json({
    servers: {
      total: servers.length,
      suspended: servers.filter((s: { Suspended: boolean }) => s.Suspended).length,
      installing: servers.filter((s: { Installing: boolean }) => s.Installing).length,
      totalRamMb,
      totalCpuPct,
      totalStorageGb,
      topImages,
      topServers,
    },
    nodes: nodeStatuses,
    activity: {
      totalUsers: users.length,
      adminCount,
      totalImages: images.length,
      loginsByDay,
      recentLogins: loginHistory.slice(0, 10),
    },
  });
}
