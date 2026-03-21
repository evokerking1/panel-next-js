import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const serverId = parseInt(id, 10);
  const body = await req.json();

  const { name, description, nodeId, imageId, Memory, Cpu, Storage, ownerId, allowStartupEdit, Suspended, StartCommand } = body;

  const server = await prisma.server.findUnique({ where: { id: serverId }, include: { node: true, image: true } });
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const wasSuspended = server.Suspended;
  const nowSuspended = Suspended === true || Suspended === 'true';

  await prisma.server.update({
    where: { id: serverId },
    data: {
      name: name ?? undefined,
      description: description ?? undefined,
      ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
      nodeId: nodeId ? parseInt(nodeId, 10) : undefined,
      imageId: imageId ? parseInt(imageId, 10) : undefined,
      Memory: Memory ? parseInt(Memory, 10) : undefined,
      Cpu: Cpu ? parseInt(Cpu, 10) : undefined,
      Storage: Storage ? parseInt(Storage, 10) : undefined,
      StartCommand: StartCommand ?? undefined,
      Suspended: nowSuspended,
    },
  });

  if (allowStartupEdit !== undefined) {
    await prisma.$executeRaw`UPDATE "Server" SET "allowStartupEdit" = ${allowStartupEdit === true || allowStartupEdit === 'true'} WHERE "id" = ${serverId}`;
  }

  // If newly suspended, stop the container
  if (!wasSuspended && nowSuspended) {
    try {
      await axios({
        method: 'POST',
        url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/stop`,
        auth: { username: 'Airlink', password: server.node.key },
        data: { id: server.UUID, stopCmd: server.image?.stop ?? 'stop' },
        timeout: 10000,
      });
    } catch { /* server may already be stopped */ }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const serverId = parseInt(id, 10);

  const server = await prisma.server.findUnique({ where: { id: serverId }, include: { node: true } });
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    await axios({
      method: 'DELETE',
      url: `${daemonSchemeSync()}://${server.node.address}:${server.node.port}/container/delete`,
      auth: { username: 'Airlink', password: server.node.key },
      data: { id: server.UUID },
      timeout: 10000,
    });
  } catch { /* daemon may not have the container */ }

  await prisma.server.delete({ where: { id: serverId } });
  return NextResponse.json({ success: true });
}
