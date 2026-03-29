import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { daemonUrl } from '@/lib/daemon';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.allowUserDeleteServer) {
    return NextResponse.json({ error: 'Server deletion is not enabled for users.' }, { status: 403 });
  }

  const { uuid } = await params;
  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true },
  });

  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (server.ownerId !== session.user.id) return NextResponse.json({ error: 'Not your server.' }, { status: 403 });

  try {
    await axios.delete(
      `${daemonUrl(server.node.address, server.node.port)}/container`,
      {
        data: { id: server.UUID, deleteCmd: 'delete' },
        auth: { username: 'Airlink', password: server.node.key },
        timeout: 10000,
      }
    );
  } catch (err: any) {
    const notFound =
      err.response?.status === 404 ||
      String(err.response?.data?.error ?? '').includes('not exist');
    if (!notFound) {
      return NextResponse.json({ error: 'Failed to delete container from node.' }, { status: 500 });
    }
  }

  await prisma.server.delete({ where: { UUID: server.UUID } });
  return NextResponse.json({ success: true });
}
