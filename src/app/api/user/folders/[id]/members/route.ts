import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFolderOwner } from '@/lib/api/folder-access';

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
