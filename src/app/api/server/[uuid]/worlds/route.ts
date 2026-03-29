import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { daemonUrl } from '@/lib/daemon';

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

  const base = daemonUrl(server.node.address, server.node.port);
  const auth = { username: 'Airlink', password: server.node.key };

  try {
    const listRes = await axios.get(`${base}/fs/list`, {
      params: { id: uuid, path: '/' },
      auth,
      timeout: 8000,
    });

    let files = typeof listRes.data === 'string' ? JSON.parse(listRes.data) : listRes.data;
    files = Array.isArray(files) ? files : [];

    const worldNames = ['world', 'world_nether', 'world_the_end'];
    const worlds = files
      .filter((f: { name: string; type: string }) => {
        if (f.type !== 'directory') return false;
        if (f.name === 'airlink') return false;
        if (worldNames.includes(f.name)) return true;
        if (f.name.includes('world') || f.name.includes('nether') || f.name.includes('end')) return true;
        return false;
      })
      .map((f: { name: string; type: string }) => ({ name: f.name, type: f.type }));

    return NextResponse.json({ worlds });
  } catch {
    return NextResponse.json({ worlds: [] });
  }
}
