import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { uuid } = await params;
  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true },
  });
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (server.ownerId !== session.user.id && !session.user.isAdmin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  try {
    const base = await buildDaemonUrl(server.node.address, server.node.port);
    const { data } = await axios.post(
      `${base}/sftp/credentials`,
      { id: uuid },
      { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 },
    );
    return NextResponse.json({ credentials: data });
  } catch {
    return NextResponse.json({ error: 'Failed to get SFTP credentials.' }, { status: 502 });
  }
}
