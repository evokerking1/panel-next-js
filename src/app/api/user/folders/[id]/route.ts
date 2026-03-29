import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

async function requireFolderOwner(req: NextRequest, folderId: number) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return { error: 'Unauthorized', status: 401 };

  const folder = await prisma.serverFolder.findUnique({ where: { id: folderId } });
  if (!folder) return { error: 'Not found.', status: 404 };
  if (folder.ownerId !== session.user.id) return { error: 'Forbidden.', status: 403 };

  return { folder, user: session.user };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireFolderOwner(req, parseInt(id));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json().catch(() => ({}));
  const { name } = body;
  if (!name || !name.trim()) return NextResponse.json({ error: 'Name required.' }, { status: 400 });

  const updated = await prisma.serverFolder.update({
    where: { id: parseInt(id) },
    data: { name: name.trim() },
    include: { members: true },
  });

  return NextResponse.json({ folder: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireFolderOwner(req, parseInt(id));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await prisma.serverFolder.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
