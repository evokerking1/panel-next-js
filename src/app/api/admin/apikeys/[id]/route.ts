import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, description, permissions, toggle } = body;

  if (toggle) {
    const key = await prisma.apiKey.findUnique({ where: { id: parseInt(id) } });
    if (!key) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    await prisma.apiKey.update({ where: { id: parseInt(id) }, data: { active: !key.active } });
    return NextResponse.json({ success: true });
  }

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const permsArray = permissions
    ? Array.isArray(permissions) ? permissions : [permissions]
    : [];

  await prisma.apiKey.update({
    where: { id: parseInt(id) },
    data: { name, description: description || null, permissions: JSON.stringify(permsArray) },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.apiKey.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
