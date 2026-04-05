import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';
import { buildImageUpdateData } from '@/lib/images/image-record';

async function getImageById(id: string) {
  return prisma.images.findUnique({ where: { id: parseInt(id) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const image = await getImageById(id);
  if (!image) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ image });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const existing = await getImageById(id);
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  let data: Record<string, unknown>;
  try {
    data = buildImageUpdateData(body, existing);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid image update.' },
      { status: 400 },
    );
  }

  const image = await prisma.images.update({ where: { id: parseInt(id) }, data });
  return NextResponse.json({ success: true, image });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.images.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
