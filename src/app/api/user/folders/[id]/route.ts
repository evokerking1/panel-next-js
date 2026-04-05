import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFolderOwner } from '@/lib/api/folder-access';

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
