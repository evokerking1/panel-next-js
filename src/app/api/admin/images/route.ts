import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';
import { buildDefaultImageData, normalizeImageRecord } from '@/lib/images/image-record';

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const images = await prisma.images.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'upload') {
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
    }
    const data = normalizeImageRecord(body as Record<string, unknown>);
    const existing = await prisma.images.findFirst({ where: { name: data.name } });
    if (existing) {
      await prisma.images.update({ where: { id: existing.id }, data });
      return NextResponse.json({ success: true, message: 'Image updated.', id: existing.id });
    }
    const created = await prisma.images.create({ data });
    return NextResponse.json({ success: true, message: 'Image created.', id: created.id });
  }

  const { name, description, author, authorName, startup } = body;
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const image = await prisma.images.create({
    data: buildDefaultImageData({ name, description, author, authorName, startup }),
  });

  return NextResponse.json({ success: true, image });
}
