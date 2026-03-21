import { requireAuthWithUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';
import PageTitle from '@/components/PageTitle';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

async function getNodeStatuses(servers: any[]) {
  const nodeStatuses: Record<number, boolean> = {};
  await Promise.all(
    servers.map(async (server) => {
      if (nodeStatuses[server.node.id] !== undefined) return;
      try {
        await axios({
          method: 'GET',
          url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}`,
          auth: { username: 'Airlink', password: server.node.key },
          timeout: 2000,
        });
        nodeStatuses[server.node.id] = true;
      } catch {
        nodeStatuses[server.node.id] = false;
      }
    }),
  );
  return nodeStatuses;
}

async function getServerStats(server: any, nodeOnline: boolean) {
  if (!nodeOnline) return { status: 'unknown', ramUsage: '0', cpuUsage: '0', ramUsed: '0MB', nodeOffline: true };

  try {
    const statusRes = await axios({
      method: 'GET',
      url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/status`,
      auth: { username: 'Airlink', password: server.node.key },
      params: { id: server.UUID },
      timeout: 2000,
    });

    const running = statusRes.data?.running === true;
    if (!running) return { status: 'stopped', ramUsage: '0', cpuUsage: '0', ramUsed: '0MB', nodeOffline: false };

    try {
      const statsRes = await axios({
        method: 'GET',
        url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/stats`,
        auth: { username: 'Airlink', password: server.node.key },
        params: { id: server.UUID },
        timeout: 2000,
      });

      const memBytes = statsRes.data?.memory?.usage || 0;
      const memMB = memBytes / (1024 * 1024);
      return {
        status: 'running',
        ramUsage: statsRes.data?.memory?.percentage || '0',
        cpuUsage: statsRes.data?.cpu?.percentage || '0',
        ramUsed: memMB >= 1024 ? `${(memMB / 1024).toFixed(1)}GB` : `${memMB.toFixed(0)}MB`,
        nodeOffline: false,
      };
    } catch {
      return { status: 'running', ramUsage: '0', cpuUsage: '0', ramUsed: '0MB', nodeOffline: false };
    }
  } catch {
    return { status: 'unknown', ramUsage: '0', cpuUsage: '0', ramUsed: '0MB', nodeOffline: true };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; err?: string }>;
}) {
  const user = await requireAuthWithUser();
  const params = await searchParams;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const perPage = 8;

  const allServers = await prisma.server.findMany({
    where: { ownerId: user.id },
    include: { node: true, owner: true },
  });

  const nodeStatuses = await getNodeStatuses(allServers);
  const anyOffline = Object.values(nodeStatuses).some((v) => !v);

  const serversWithStats = await Promise.all(
    allServers.map((s) => getServerStats(s, nodeStatuses[s.node.id] ?? false).then((stats) => ({ ...s, ...stats }))),
  );

  const paginatedServers = serversWithStats.slice((page - 1) * perPage, page * perPage);

  const folders = await prisma.serverFolder.findMany({
    where: { ownerId: user.id },
    include: { members: true },
    orderBy: { createdAt: 'asc' },
  });

  const userServerLimit =
    user.serverLimit !== null && user.serverLimit !== undefined
      ? user.serverLimit
      : (settings?.defaultServerLimit ?? 0);

  const canCreateServer =
    !user.isAdmin && (settings?.allowUserCreateServer ?? false) && userServerLimit > 0;

  return (
    <div className="pt-16 px-6 lg:px-12 pb-8">
      <PageTitle title="Servers" subtitle="View and manage your servers." />

      <DashboardClient
        user={{ id: user.id, isAdmin: user.isAdmin, username: user.username ?? '' }}
        servers={paginatedServers as any}
        allServers={serversWithStats as any}
        folders={folders as any}
        canCreateServer={canCreateServer}
        currentPage={page}
        totalPages={Math.ceil(allServers.length / perPage)}
        daemonOffline={anyOffline}
        err={params.err}
      />
    </div>
  );
}
