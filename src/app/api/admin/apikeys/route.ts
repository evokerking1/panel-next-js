import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

function generateKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => chars[byte % chars.length]).join('');
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function shouldHash(): Promise<boolean> {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    return s?.hashApiKeys === true;
  } catch {
    return false;
  }
}

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await prisma.apiKey.findMany({
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, description, permissions } = body;

  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const rawKey = generateKey(32);
  const useHash = await shouldHash();
  const storedKey = useHash ? sha256(rawKey) : rawKey;

  const permsArray = permissions
    ? Array.isArray(permissions) ? permissions : [permissions]
    : [];

  await prisma.apiKey.create({
    data: {
      name,
      key: storedKey,
      description: description || null,
      permissions: JSON.stringify(permsArray),
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true, rawKey: useHash ? rawKey : storedKey });
}
