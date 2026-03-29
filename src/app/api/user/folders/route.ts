import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

async function getUser(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  return session.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const folders = await prisma.serverFolder.findMany({
    where: { ownerId: user.id },
    include: { members: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (name.trim().length > 64) {
    return NextResponse.json({ error: 'Name must be 64 characters or fewer.' }, { status: 400 });
  }

  const folder = await prisma.serverFolder.create({
    data: { name: name.trim(), ownerId: user.id },
    include: { members: true },
  });

  return NextResponse.json({ folder });
}
