import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';
import axios from 'axios';
import { buildDaemonUrl, daemonInstallState } from '@/lib/daemon';

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true },
  });
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (server.ownerId !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const base = await buildDaemonUrl(server.node.address, server.node.port);
  const authOpts = { username: 'Airlink', password: server.node.key };
  const installState = await daemonInstallState(server.node.address, server.node.port, server.node.key, server.UUID);

  if (installState === 'installed' && (server.Installing || server.Queued)) {
    await prisma.server.update({
      where: { UUID: server.UUID },
      data: { Installing: false, Queued: false },
    });
    server.Installing = false;
    server.Queued = false;
  }

  try {
    const [statusRes, statsRes] = await Promise.all([
      axios.get(`${base}/container/status`, { params: { id: uuid }, auth: authOpts, timeout: 4000 }),
      axios.get(`${base}/container/stats`, { params: { id: uuid }, auth: authOpts, timeout: 4000 }).catch(() => null),
    ]);

    const running = statusRes.data?.running === true;
    let ramPct = '0', cpuPct = '0', ramUsed = '0MB';

    if (running && statsRes?.data) {
      ramPct = statsRes.data.memory?.percentage ?? '0';
      cpuPct = statsRes.data.cpu?.percentage ?? '0';
      const bytes = statsRes.data.memory?.usage ?? 0;
      const mb = bytes / (1024 * 1024);
      ramUsed = mb >= 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
    }

    return NextResponse.json({
      running,
      uptime: statusRes.data?.uptime ?? null,
      state: installState,
      installed: installState === 'installed' || (!server.Installing && !server.Queued),
      failed: installState === 'failed',
      stats: { ramPct, cpuPct, ramUsed },
    });
  } catch {
    return NextResponse.json({
      running: false,
      uptime: null,
      state: installState,
      installed: installState === 'installed' || (!server.Installing && !server.Queued),
      failed: installState === 'failed',
      stats: { ramPct: '0', cpuPct: '0', ramUsed: '0MB' },
    });
  }
}
