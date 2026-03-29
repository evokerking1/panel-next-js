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

  const [userCount, nodeCount, instanceCount, imageCount] = await Promise.all([
    prisma.users.count(),
    prisma.node.count(),
    prisma.server.count(),
    prisma.images.count(),
  ]);

  return NextResponse.json({ userCount, nodeCount, instanceCount, imageCount });
}
