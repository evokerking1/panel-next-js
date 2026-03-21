import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

async function requireAdminUser(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return null;
  const full = await prisma.users.findUnique({ where: { id: user.id } });
  return full?.isAdmin ? full : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: any = {
    username: body.username || undefined,
    email: body.email || undefined,
    isAdmin: typeof body.isAdmin === 'boolean' ? body.isAdmin : undefined,
    description: body.description !== undefined ? body.description : undefined,
    serverLimit: body.serverLimit !== '' && body.serverLimit !== null ? Number(body.serverLimit) : null,
    maxMemory: body.maxMemory !== '' && body.maxMemory !== null ? Number(body.maxMemory) : null,
    maxCpu: body.maxCpu !== '' && body.maxCpu !== null ? Number(body.maxCpu) : null,
    maxStorage: body.maxStorage !== '' && body.maxStorage !== null ? Number(body.maxStorage) : null,
  };

  if (body.password && body.password.trim().length > 0) {
    data.password = await bcrypt.hash(body.password, 12);
  }

  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

  const updated = await prisma.users.update({ where: { id: parseInt(id, 10) }, data });
  return NextResponse.json({ success: true, user: { id: updated.id, username: updated.username } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);

  if (userId === admin.id) return NextResponse.json({ error: 'Cannot delete yourself.' }, { status: 400 });

  await prisma.users.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
