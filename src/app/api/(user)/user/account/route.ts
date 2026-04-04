import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';

async function getSessionUser(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  return session.user ?? null;
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.users.findUnique({
    where: { id: sessionUser.id },
    include: {
      loginHistory: { orderBy: { timestamp: 'desc' }, take: 10 },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { password: _, ...safe } = user;
  return NextResponse.json({ user: safe });
}

export async function PUT(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { username, email, description, newPassword, currentPassword } = body;

  const user = await prisma.users.findUnique({ where: { id: sessionUser.id } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (email && email !== user.email) {
    const clash = await prisma.users.findFirst({ where: { email, id: { not: user.id } } });
    if (clash) return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
  }

  if (username && username !== user.username) {
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3–32 characters: letters, numbers, _ or -.' }, { status: 400 });
    }
    const clash = await prisma.users.findFirst({ where: { username, id: { not: user.id } } });
    if (clash) return NextResponse.json({ error: 'Username already in use.' }, { status: 409 });
  }

  const data: Record<string, unknown> = {};
  if (email) data.email = email.trim().toLowerCase();
  if (username) data.username = username.trim();
  if (description !== undefined) data.description = String(description).slice(0, 255).trim();

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password required to set a new one.' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  await prisma.users.update({ where: { id: user.id }, data });
  return NextResponse.json({ success: true });
}
