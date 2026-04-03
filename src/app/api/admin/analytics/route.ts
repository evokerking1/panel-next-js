import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { daemonUrl } from '@/lib/daemon';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = new URL(req.url).searchParams.get('type')

  if (type === 'playerstats') {
    const servers = await prisma.server.findMany({
      select: { UUID: true, name: true, nodeId: true, Ports: true },
    })
    const nodes = await prisma.node.findMany()
    const history = await prisma.playerStats.findMany({
      orderBy: { timestamp: 'desc' },
      take: 576,
      select: { timestamp: true, totalPlayers: true },
    })

    const serverResults = await Promise.all(
      servers.map(async (srv: { UUID: string; name: string; nodeId: number; Ports: string }) => {
        const node = nodes.find((n: { id: number }) => n.id === srv.nodeId)
        if (!node) return null
        try {
          const base = daemonUrl(node.address, node.port)
          const r = await axios.get(`${base}/server/${srv.UUID}/players`, {
            auth: { username: 'Airlink', password: node.key },
            timeout: 4000,
          })
          const players: string[] = r.data?.players ?? []
          const maxPlayers: number = r.data?.maxPlayers ?? 0
          const version: string | undefined = r.data?.version
          const motd: string | undefined = r.data?.motd
          return { uuid: srv.UUID, name: srv.name, onlinePlayers: players.length, maxPlayers, players, version, motd }
        } catch {
          return null
        }
      })
    )

    const online = serverResults.filter(Boolean) as {
      uuid: string; name: string; onlinePlayers: number; maxPlayers: number
      players: string[]; version?: string; motd?: string
    }[]

    const totalPlayers = online.reduce((s, sv) => s + sv.onlinePlayers, 0)
    const maxCapacity = online.reduce((s, sv) => s + sv.maxPlayers, 0)
    const utilization = maxCapacity > 0 ? Math.round((totalPlayers / maxCapacity) * 100) : 0

    return NextResponse.json({
      totalPlayers,
      maxCapacity,
      onlineServers: online.length,
      utilization,
      servers: online,
      history: history.reverse().map((h: { timestamp: Date; totalPlayers: number }) => ({ timestamp: h.timestamp.toISOString(), count: h.totalPlayers })),
    })
  }

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
        const base = daemonUrl(node.address, node.port);
        const r = await axios.get(base, {
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
