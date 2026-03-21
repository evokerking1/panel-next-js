import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const folders = await prisma.serverFolder.findMany({
    where: { ownerId: user.id },
    include: { members: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, folders });
}

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const name = (body.name as string)?.trim();

  if (!name || name.length === 0) {
    return NextResponse.json({ success: false, error: 'Folder name is required.' }, { status: 400 });
  }
  if (name.length > 64) {
    return NextResponse.json({ success: false, error: 'Folder name must be 64 characters or fewer.' }, { status: 400 });
  }

  const folder = await prisma.serverFolder.create({
    data: { name, ownerId: user.id },
    include: { members: true },
  });

  return NextResponse.json({ success: true, folder });
}
