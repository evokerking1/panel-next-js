import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.users.findMany({
    include: { servers: true },
    orderBy: { id: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { email, username, password, isAdmin } = body as {
    email: string;
    username: string;
    password: string;
    isAdmin?: boolean | string;
  };

  if (!email || !username || !password) {
    return NextResponse.json({ error: 'Email, username, and password are required.' }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 3–20 alphanumeric characters.' }, { status: 400 });
  }

  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json({ error: 'Password must be at least 8 characters with a letter and number.' }, { status: 400 });
  }

  const existing = await prisma.users.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return NextResponse.json({ error: 'Email or username already exists.' }, { status: 409 });

  await prisma.users.create({
    data: {
      email,
      username,
      password: await bcrypt.hash(password, 10),
      isAdmin: isAdmin === true || isAdmin === 'true',
    },
  });

  return NextResponse.json({ success: true });
}
