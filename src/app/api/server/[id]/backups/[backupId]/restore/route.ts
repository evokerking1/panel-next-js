import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; backupId: string }> },
) {
  const { id, backupId } = await params;
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const server = await prisma.server.findUnique({ where: { UUID: id }, include: { node: true } });
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const backup = await prisma.backup.findUnique({ where: { UUID: backupId } });
  if (!backup || backup.serverId !== id) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });

  try {
    await axios.post(
      `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/backup/restore`,
      { id, backupPath: backup.filePath },
      { auth: { username: 'Airlink', password: server.node.key }, timeout: 60000 },
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data?.error ?? err.message }, { status: 500 });
  }
}
