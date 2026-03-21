import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

export async function GET(
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
    const response = await axios.get(
      `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/backup/download`,
      {
        params: { id, backupPath: backup.filePath },
        auth: { username: 'Airlink', password: server.node.key },
        responseType: 'arraybuffer',
        timeout: 120000,
      },
    );

    return new NextResponse(response.data as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${backup.name}.tar.gz"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
