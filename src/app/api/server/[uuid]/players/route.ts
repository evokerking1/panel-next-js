import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';
import { daemonAuth, getAccessibleServer } from '@/lib/api/server-access';

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getAccessibleServer(req, uuid, { node: true });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { server } = result;

  const base = await buildDaemonUrl(server.node.address, server.node.port);
  const auth = daemonAuth(server.node.key);

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
