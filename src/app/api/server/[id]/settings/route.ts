import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

async function verify(req: NextRequest, id: string) {
  const user = await getApiUser(req);
  if (!user) return null;
  const server = await prisma.server.findUnique({ where: { UUID: id }, include: { node: true } });
  if (!server) return null;
  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) return null;
  return { server, user: fullUser! };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verify(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updated = await prisma.server.update({
    where: { UUID: id },
    data: {
      name: body.name ?? undefined,
      description: body.description ?? undefined,
    },
  });
  return NextResponse.json({ success: true, server: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verify(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { server, user } = result;

  // Non-admins need the setting to allow deleting
  if (!user.isAdmin) {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.allowUserDeleteServer) {
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
  }

  // Tell the daemon to remove the container
  try {
    await axios({
      method: 'DELETE',
      url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/delete`,
      auth: { username: 'Airlink', password: server.node.key },
      data: { id },
      timeout: 10000,
    });
  } catch { /* daemon may already have removed it */ }

  await prisma.server.delete({ where: { UUID: id } });
  return NextResponse.json({ success: true });
}
