import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';
import { buildUserLimitUpdates } from '@/lib/settings/panel-settings';

async function getTargetUser(id: number) {
  return prisma.users.findUnique({ where: { id } })
}

async function assertUniqueField(field: 'email' | 'username', value: string, targetId: number) {
  const clash = await prisma.users.findFirst({ where: { [field]: value, id: { not: targetId } } })
  if (clash) {
    throw new Error(field === 'email' ? 'Email already in use.' : 'Username already in use.')
  }
}

async function buildUserUpdateData(body: Record<string, unknown>, targetId: number, target: { email: string; username: string | null }) {
  const data: Record<string, unknown> = buildUserLimitUpdates(body)

  if (body.email && body.email !== target.email) {
    await assertUniqueField('email', String(body.email), targetId)
    data.email = body.email
  }

  if (body.username && body.username !== target.username) {
    await assertUniqueField('username', String(body.username), targetId)
    data.username = body.username
  }

  if (body.description !== undefined) data.description = body.description
  if (body.isAdmin !== undefined) data.isAdmin = body.isAdmin === true || body.isAdmin === 'true'
  if (body.password && String(body.password).trim()) {
    data.password = await bcrypt.hash(String(body.password), 10)
  }

  return data
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const target = await prisma.users.findUnique({
    where: { id: parseInt(id) },
    include: { servers: { include: { node: true } }, loginHistory: { orderBy: { timestamp: 'desc' }, take: 10 } },
  });

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { password: _, ...safe } = target;
  return NextResponse.json({ user: safe });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const targetId = parseInt(id);

  const target = await getTargetUser(targetId);
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  let data: Record<string, unknown>;
  try {
    data = await buildUserUpdateData(body, targetId, target);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid user update.' },
      { status: 409 },
    )
  }

  await prisma.users.update({ where: { id: targetId }, data });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.users.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
