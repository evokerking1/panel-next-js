import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  if (body.active !== undefined) data.active = body.active;
  if (body.name) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  const key = await prisma.apiKey.update({ where: { id: parseInt(id, 10) }, data });
  return NextResponse.json({ success: true, key });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.apiKey.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}
