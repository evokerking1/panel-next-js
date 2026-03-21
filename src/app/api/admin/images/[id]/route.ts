import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.images.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ['name','description','author','authorName','startup','stop','startup_done'];
  const data: any = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  const updated = await prisma.images.update({ where: { id: parseInt(id, 10) }, data });
  return NextResponse.json({ success: true, image: updated });
}
