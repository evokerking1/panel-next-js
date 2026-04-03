import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

const CACHE_FILE = path.resolve(process.cwd(), 'storage', 'eggs', 'catalogue.json');

function normalizeEgg(raw: Record<string, unknown>) {
  const dockerImages = raw.docker_images || raw.dockerImages;
  const dockerImagesArray = Array.isArray(dockerImages)
    ? dockerImages
    : typeof dockerImages === 'object' && dockerImages !== null
      ? Object.entries(dockerImages as Record<string, string>).map(([k, v]) => ({ [k]: v }))
      : [];

  return {
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    author: String(raw.author ?? ''),
    authorName: String(raw.authorName ?? ''),
    startup: String(raw.startup ?? ''),
    stop: String((raw as Record<string, unknown>).stop ?? ''),
    startup_done: String((raw as Record<string, unknown>).startup_done ?? ''),
    config_files: String((raw as Record<string, unknown>).config_files ?? ''),
    meta: JSON.stringify(raw.meta ?? {}),
    dockerImages: JSON.stringify(dockerImagesArray),
    info: JSON.stringify(raw.info ?? {}),
    scripts: JSON.stringify(raw.scripts ?? {}),
    variables: JSON.stringify(raw.variables ?? []),
  };
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
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

  const data = normalizeEgg(egg);
  if (!data.name) return NextResponse.json({ error: 'Invalid egg data — missing name.' }, { status: 400 });

  const existing = await prisma.images.findFirst({ where: { name: data.name } });
  if (existing) {
    return NextResponse.json({ error: `An image named "${data.name}" is already installed.` }, { status: 409 });
  }

  const image = await prisma.images.create({ data });
  return NextResponse.json({ message: `"${image.name}" installed successfully.`, id: image.id });
}
