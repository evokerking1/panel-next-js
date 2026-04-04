import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const servers = await prisma.server.findMany({
    where: session.user.isAdmin ? {} : { ownerId: session.user.id },
    include: { node: true, owner: true, image: true },
  });

  const nodeCache: Record<number, boolean> = {};

  type ServerRow = (typeof servers)[number];
  const serversWithStats = await Promise.all(
    servers.map(async (server: ServerRow) => {
      if (nodeCache[server.nodeId] === undefined) {
        try {
          const base = await buildDaemonUrl(server.node.address, server.node.port);
          await axios.get(base, {
            auth: { username: 'Airlink', password: server.node.key },
            timeout: 2000,
          });
          nodeCache[server.nodeId] = true;
        } catch {
          nodeCache[server.nodeId] = false;
        }
      }

      if (!nodeCache[server.nodeId]) {
        return {
          ...server,
          status: 'unknown',
          ramUsage: '0',
          cpuUsage: '0',
          ramUsed: '0MB',
        };
      }

      try {
        const base = await buildDaemonUrl(server.node.address, server.node.port);
        const auth = { username: 'Airlink', password: server.node.key };

        const statusRes = await axios.get(`${base}/container/status`, {
          params: { id: server.UUID },
          auth,
          timeout: 2000,
        });

        const running = statusRes.data?.running === true;
        let ramUsage = '0', cpuUsage = '0', ramUsed = '0MB';

        if (running) {
          try {
            const statsRes = await axios.get(`${base}/container/stats`, {
              params: { id: server.UUID },
              auth,
              timeout: 2000,
            });
            ramUsage = statsRes.data?.memory?.percentage ?? '0';
            cpuUsage = statsRes.data?.cpu?.percentage ?? '0';
            const bytes = statsRes.data?.memory?.usage ?? 0;
            const mb = bytes / (1024 * 1024);
            ramUsed = mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
          } catch {}
        }

        return {
          ...server,
          status: running ? 'running' : 'stopped',
          ramUsage,
          cpuUsage,
          ramUsed,
        };
      } catch {
        return { ...server, status: 'unknown', ramUsage: '0', cpuUsage: '0', ramUsed: '0MB' };
      }
    })
  );

  return NextResponse.json({ servers: serversWithStats });
}
