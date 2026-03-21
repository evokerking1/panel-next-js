import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const serverUUID = body.serverUUID as string;

  const folder = await prisma.serverFolder.findUnique({ where: { id: parseInt(id, 10) } });
  if (!folder || folder.ownerId !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  const server = await prisma.server.findUnique({ where: { UUID: serverUUID } });
  if (!server || server.ownerId !== user.id) {
    return NextResponse.json({ success: false, error: 'Server not found.' }, { status: 404 });
  }

  // Remove from any existing folder first
  await prisma.serverFolderMember.deleteMany({ where: { serverUUID } });

  await prisma.serverFolderMember.create({
    data: { folderId: folder.id, serverUUID },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const serverUUID = body.serverUUID as string;

  const folder = await prisma.serverFolder.findUnique({ where: { id: parseInt(id, 10) } });
  if (!folder || folder.ownerId !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  await prisma.serverFolderMember.deleteMany({ where: { folderId: folder.id, serverUUID } });
  return NextResponse.json({ success: true });
}
