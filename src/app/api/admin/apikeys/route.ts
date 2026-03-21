import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

function generateKey(length = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = await prisma.apiKey.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description, permissions } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const rawKey = generateKey();
  const storedKey = settings?.hashApiKeys
    ? crypto.createHash('sha256').update(rawKey).digest('hex')
    : rawKey;

  const key = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      permissions: JSON.stringify(Array.isArray(permissions) ? permissions : []),
      key: storedKey,
      userId: admin.id,
    },
  });

  return NextResponse.json({ success: true, id: key.id, rawKey });
}
