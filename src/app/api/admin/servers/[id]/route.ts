import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

async function findServer(idOrUuid: string) {
  const numericId = Number.parseInt(idOrUuid, 10);
  return prisma.server.findFirst({
    where: Number.isNaN(numericId)
      ? { UUID: idOrUuid }
      : { OR: [{ id: numericId }, { UUID: idOrUuid }] },
    include: { node: true, image: true, owner: true },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const server = await findServer(id);
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ server });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, description, nodeId, imageId, Memory, Cpu, Storage, ownerId, Suspended, StartCommand, allowStartupEdit } = body;

  if (!name || !nodeId || !imageId || !Memory || !Cpu || !Storage || !ownerId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const server = await findServer(id);
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const newSuspended = Suspended === true || Suspended === 'true';
  const suspensionChanged = server.Suspended !== newSuspended;

  await prisma.server.update({
    where: { id: server.id },
    data: {
      name,
      description: description || '',
      nodeId: parseInt(nodeId),
      imageId: parseInt(imageId),
      ownerId: parseInt(ownerId),
      Memory: parseInt(Memory),
      Cpu: parseInt(Cpu),
      Storage: parseInt(Storage),
      StartCommand: StartCommand || '',
      Suspended: newSuspended,
      allowStartupEdit: allowStartupEdit === true || allowStartupEdit === 'true',
    },
  });

  if (suspensionChanged && newSuspended) {
    try {
      const base = await buildDaemonUrl(server.node.address, server.node.port);
      await axios.post(
        `${base}/container/stop`,
        { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
        { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 },
      );
    } catch {}
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const server = await findServer(id);
  if (!server) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    const base = await buildDaemonUrl(server.node.address, server.node.port);
    await axios.delete(
      `${base}/container`,
      { data: { id: server.UUID }, auth: { username: 'Airlink', password: server.node.key }, timeout: 10000 },
    );
  } catch {}

  await prisma.$transaction([
    prisma.backup.deleteMany({ where: { serverId: server.UUID } }),
    prisma.sftpCredential.deleteMany({ where: { serverId: server.UUID } }),
    prisma.serverFolderMember.deleteMany({ where: { serverUUID: server.UUID } }),
    prisma.server.delete({ where: { id: server.id } }),
  ]);
  return NextResponse.json({ success: true });
}
