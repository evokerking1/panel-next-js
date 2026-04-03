import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

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
  const auth = { username: 'Airlink', password: server.node.key };

  try {
    const statusRes = await axios.get(`${base}/container/status`, {
      params: { id: uuid },
      auth,
      timeout: 4000,
    });

    const online = statusRes.data?.running === true;

    if (!online) {
      return NextResponse.json({ online: false, players: [], serverInfo: null });
    }

    try {
      const playersRes = await axios.get(`${base}/minecraft/players`, {
        params: { id: uuid },
        auth,
        timeout: 6000,
      });

      const players = playersRes.data?.players ?? [];
      const serverInfo = playersRes.data?.serverInfo ?? null;

      return NextResponse.json({ online: true, players, serverInfo });
    } catch {
      return NextResponse.json({ online: true, players: [], serverInfo: null });
    }
  } catch {
    return NextResponse.json({ online: false, players: [], serverInfo: null });
  }
}
