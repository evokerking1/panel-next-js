import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { isPterodactylEgg, parseEgg, normalizeEggForDb, validateEggData } from '@/lib/eggParser';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

function normalizeImageData(raw: Record<string, unknown>) {
  if (isPterodactylEgg(raw)) {
    const egg = parseEgg(raw);
    return normalizeEggForDb(egg);
  }
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
    stop: String((raw as any).stop ?? ''),
    startup_done: String((raw as any).startup_done ?? ''),
    config_files: String((raw as any).config_files ?? ''),
    meta: JSON.stringify(raw.meta ?? {}),
    dockerImages: JSON.stringify(dockerImagesArray),
    info: JSON.stringify(raw.info ?? {}),
    scripts: JSON.stringify(raw.scripts ?? {}),
    variables: JSON.stringify(raw.variables ?? []),
  };
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const images = await prisma.images.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await req.json() as Record<string, unknown>;
  const { valid, errors } = validateEggData(raw);
  if (!valid) return NextResponse.json({ error: 'Invalid egg data', details: errors }, { status: 400 });

  const data = normalizeImageData(raw);
  const existing = await prisma.images.findFirst({ where: { name: data.name } });

  if (existing) {
    await prisma.images.update({ where: { id: existing.id }, data });
    return NextResponse.json({ success: true, name: data.name, id: existing.id, updated: true });
  }

  const created = await prisma.images.create({ data });
  return NextResponse.json({ success: true, name: data.name, id: created.id, updated: false });
}
