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
  if (body.name) data.name = body.name;
  if (body.address) data.address = body.address;
  if (body.port) data.port = parseInt(body.port, 10);
  if (body.key) data.key = body.key;
  if (body.ram !== undefined) data.ram = parseInt(body.ram, 10);
  if (body.cpu !== undefined) data.cpu = parseInt(body.cpu, 10);
  if (body.disk !== undefined) data.disk = parseInt(body.disk, 10);

  const node = await prisma.node.update({ where: { id: parseInt(id, 10) }, data });
  return NextResponse.json({ success: true, node });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.node.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ success: true });
}
