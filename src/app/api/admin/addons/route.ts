import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const addons = await prisma.addon.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ addons });
}
