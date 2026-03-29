import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const addons = await prisma.addon.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ addons });
}
