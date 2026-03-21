import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

async function verifyAccess(req: NextRequest, id: string) {
  const user = await getApiUser(req);
  if (!user) return null;
  const server = await prisma.server.findUnique({ where: { UUID: id }, include: { node: true } });
  if (!server) return null;
  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) return null;
  return { server, user: fullUser! };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verifyAccess(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const backups = await prisma.backup.findMany({
    where: { serverId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(backups.map((b) => ({ ...b, size: b.size?.toString() ?? '0' })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verifyAccess(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { server } = result;
  const body = await req.json();
  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({ error: 'Backup name is required.' }, { status: 400 });

  try {
    const response = await axios.post(
      `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/backup`,
      { id, name },
      { auth: { username: 'Airlink', password: server.node.key }, timeout: 300000 },
    );

    if (response.data.success) {
      const backup = await prisma.backup.create({
        data: {
          UUID: response.data.backup.uuid,
          name,
          serverId: id,
          filePath: response.data.backup.filePath,
          size: BigInt(response.data.backup.size ?? 0),
        },
      });
      return NextResponse.json({ success: true, backup: { ...backup, size: backup.size?.toString() ?? '0' } });
    }
    return NextResponse.json({ error: 'Daemon failed to create backup.' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.response?.data?.error ?? err.message }, { status: 500 });
  }
}
