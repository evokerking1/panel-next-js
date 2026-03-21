import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = await prisma.users.findMany({ include: { servers: true }, orderBy: { id: 'asc' } });
  return NextResponse.json(users.map((u) => ({ ...u, password: undefined })));
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, username, password, isAdmin } = await req.json();
  if (!email || !username || !password) {
    return NextResponse.json({ error: 'email, username, and password are required.' }, { status: 400 });
  }

  const existing = await prisma.users.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return NextResponse.json({ error: 'Username or email already taken.' }, { status: 409 });

  const user = await prisma.users.create({
    data: {
      email,
      username,
      password: await bcrypt.hash(password, 12),
      isAdmin: isAdmin === true,
      description: 'No About Me',
    },
  });

  return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
}
