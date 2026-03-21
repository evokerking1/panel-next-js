import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

async function verifyAccess(req: NextRequest, serverId: string) {
  const user = await getApiUser(req);
  if (!user) return null;
  const server = await prisma.server.findUnique({ where: { UUID: serverId }, include: { node: true } });
  if (!server) return null;
  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) return null;
  return { server, user: fullUser! };
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; backupId: string }> },
) {
  const { id, backupId } = await params;
  const result = await verifyAccess(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { server } = result;
  const backup = await prisma.backup.findUnique({ where: { UUID: backupId } });
  if (!backup || backup.serverId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await axios.delete(
      `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/backup`,
      { auth: { username: 'Airlink', password: server.node.key }, data: { id, backupId } },
    );
  } catch { /* daemon may not have it */ }

  await prisma.backup.delete({ where: { UUID: backupId } });
  return NextResponse.json({ success: true });
}
