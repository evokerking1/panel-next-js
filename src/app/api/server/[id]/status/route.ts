import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { getServerStatus } from '@/lib/serverStatus';
import { checkForServerInstallation } from '@/lib/serverInstall';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true },
  });
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [serverStatus, installState] = await Promise.all([
    getServerStatus({
      nodeAddress: server.node.address,
      nodePort: server.node.port,
      serverUUID: server.UUID,
      nodeKey: server.node.key,
    }),
    axios
      .get(`${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/status/${server.UUID}`, {
        auth: { username: 'Airlink', password: server.node.key },
        timeout: 4000,
      })
      .then((r) => r.data.state as string)
      .catch(() => null),
  ]);

  return NextResponse.json({ ...serverStatus, state: installState });
}
