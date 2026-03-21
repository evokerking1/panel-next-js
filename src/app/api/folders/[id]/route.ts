import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });

  const folder = await prisma.serverFolder.findUnique({ where: { id: parseInt(id, 10) } });
  if (!folder || folder.ownerId !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  const updated = await prisma.serverFolder.update({ where: { id: folder.id }, data: { name } });
  return NextResponse.json({ success: true, folder: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const folder = await prisma.serverFolder.findUnique({ where: { id: parseInt(id, 10) } });
  if (!folder || folder.ownerId !== user.id) {
    return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  await prisma.serverFolder.delete({ where: { id: folder.id } });
  return NextResponse.json({ success: true });
}
