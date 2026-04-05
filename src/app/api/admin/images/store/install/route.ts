import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs';
import { requireAdminUser } from '@/lib/api/admin-auth';
import { normalizeImageRecord } from '@/lib/images/image-record';

const CACHE_FILE = path.resolve(process.cwd(), 'storage', 'eggs', 'catalogue.json');

export async function POST(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { egg?: Record<string, unknown>; imageId?: string };

  let egg: Record<string, unknown> | null = null;

  // Prefer a directly-provided egg object (same as Express sends from the modal)
  if (body.egg && typeof body.egg === 'object' && body.egg.name) {
    egg = body.egg;
  } else if (body.imageId) {
    // Fall back to looking up by group/name from the cache
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        const entry = (cache.images || []).find((i: { group?: string; name?: string }) =>
          i.group === body.imageId || i.name === body.imageId
        );
        if (entry?.egg) egg = entry.egg;
      }
    } catch {}
  }

  if (!egg) {
    return NextResponse.json({ error: 'Image not found in catalogue.' }, { status: 404 });
  }

  const data = normalizeImageRecord(egg);
  if (!data.name) return NextResponse.json({ error: 'Invalid egg data — missing name.' }, { status: 400 });

  const existing = await prisma.images.findFirst({ where: { name: data.name } });
  if (existing) {
    return NextResponse.json({ error: `An image named "${data.name}" is already installed.` }, { status: 409 });
  }

  const image = await prisma.images.create({ data });
  return NextResponse.json({ message: `"${image.name}" installed successfully.`, id: image.id });
}
