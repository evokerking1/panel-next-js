import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

function normalizeImage(raw: Record<string, unknown>) {
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

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const images = await prisma.images.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action === 'upload') {
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
    }
    const data = normalizeImage(body as Record<string, unknown>);
    const existing = await prisma.images.findFirst({ where: { name: data.name } });
    if (existing) {
      await prisma.images.update({ where: { id: existing.id }, data });
      return NextResponse.json({ success: true, message: 'Image updated.', id: existing.id });
    }
    const created = await prisma.images.create({ data });
    return NextResponse.json({ success: true, message: 'Image created.', id: created.id });
  }

  const { name, description, author, authorName, startup } = body;
  if (!name || !startup) {
    return NextResponse.json({ error: 'Name and startup command are required.' }, { status: 400 });
  }

  const image = await prisma.images.create({
    data: {
      name,
      description: description || '',
      author: author || '',
      authorName: authorName || '',
      startup,
      stop: 'stop',
      startup_done: '',
      config_files: '',
      meta: JSON.stringify({ version: 'AL_V1' }),
      dockerImages: JSON.stringify([]),
      info: JSON.stringify({ features: [] }),
      scripts: JSON.stringify({}),
      variables: JSON.stringify([]),
    },
  });

  return NextResponse.json({ success: true, id: image.id });
}
