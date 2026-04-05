import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; serverUUID: string }> }) {
  const { id, serverUUID } = await params;
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const folder = await prisma.serverFolder.findUnique({ where: { id: parseInt(id) } });
  if (!folder) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (folder.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  await prisma.serverFolderMember.deleteMany({
    where: { folderId: parseInt(id), serverUUID },
  });

  return NextResponse.json({ success: true });
}
