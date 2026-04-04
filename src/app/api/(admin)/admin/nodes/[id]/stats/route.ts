import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const node = await prisma.node.findUnique({ where: { id: parseInt(id) } });
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const base = await buildDaemonUrl(node.address, node.port);
    const { data } = await axios.get(`${base}/stats`, {
      auth: { username: 'Airlink', password: node.key },
      timeout: 4000,
    });
    return NextResponse.json({ stats: data });
  } catch {
    return NextResponse.json({ error: 'Unable to fetch stats from node.' }, { status: 502 });
  }
}
