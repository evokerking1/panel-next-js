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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireFolderOwner(req, parseInt(id));
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json().catch(() => ({}));
  const { serverUUID } = body;
  if (!serverUUID) return NextResponse.json({ error: 'serverUUID required.' }, { status: 400 });

  const existing = await prisma.serverFolderMember.findUnique({ where: { serverUUID } });
  if (existing) return NextResponse.json({ success: true, message: 'Already in folder.' });

  await prisma.serverFolderMember.create({
    data: { folderId: parseInt(id), serverUUID },
  });

  return NextResponse.json({ success: true });
}
