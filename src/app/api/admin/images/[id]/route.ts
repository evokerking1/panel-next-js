import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const image = await prisma.images.findUnique({ where: { id: parseInt(id) } });
  if (!image) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ image });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const section = body.section as string | undefined;

  const existing = await prisma.images.findUnique({ where: { id: parseInt(id) } });
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  let data: Record<string, unknown> = {};

  if (section === 'general') {
    if (!body.name || !body.startup) {
      return NextResponse.json({ error: 'Name and startup are required.' }, { status: 400 });
    }
    data = {
      name: body.name,
      description: body.description || '',
      author: body.author || '',
      startup: body.startup,
      stop: body.stop || 'stop',
      startup_done: body.startup_done || '',
    };
  } else if (section === 'docker') {
    data = {
      dockerImages: typeof body.dockerImages === 'string'
        ? body.dockerImages
        : JSON.stringify(body.dockerImages ?? []),
    };
  } else if (section === 'variables') {
    data = {
      variables: typeof body.variables === 'string'
        ? body.variables
        : JSON.stringify(body.variables ?? []),
    };
  } else if (section === 'raw') {
    // raw edit — accept any known field, ignore section key
    const { section: _s, ...rest } = body;
    void _s;
    data = {
      name: rest.name ?? existing.name,
      description: rest.description ?? existing.description,
      author: rest.author ?? existing.author,
      authorName: rest.authorName ?? existing.authorName,
      startup: rest.startup ?? existing.startup,
      stop: rest.stop ?? existing.stop,
      startup_done: rest.startup_done ?? existing.startup_done,
      config_files: rest.config_files ?? existing.config_files,
      dockerImages: typeof rest.dockerImages === 'string' ? rest.dockerImages : JSON.stringify(rest.dockerImages ?? []),
      variables: typeof rest.variables === 'string' ? rest.variables : JSON.stringify(rest.variables ?? []),
      scripts: typeof rest.scripts === 'string' ? rest.scripts : JSON.stringify(rest.scripts ?? {}),
      info: typeof rest.info === 'string' ? rest.info : JSON.stringify(rest.info ?? {}),
    };
  } else {
    // legacy full-update path (no section field)
    const { name, description, author, authorName, startup, stop, startup_done, config_files, dockerImages, variables, scripts, info } = body;
    if (!name || !startup) {
      return NextResponse.json({ error: 'Name and startup are required.' }, { status: 400 });
    }
    data = {
      name,
      description: description || '',
      author: author || '',
      authorName: authorName || '',
      startup,
      stop: stop || 'stop',
      startup_done: startup_done || '',
      config_files: config_files || '',
      dockerImages: typeof dockerImages === 'string' ? dockerImages : JSON.stringify(dockerImages ?? []),
      variables: typeof variables === 'string' ? variables : JSON.stringify(variables ?? []),
      scripts: typeof scripts === 'string' ? scripts : JSON.stringify(scripts ?? {}),
      info: typeof info === 'string' ? info : JSON.stringify(info ?? {}),
    };
  }

  const image = await prisma.images.update({ where: { id: parseInt(id) }, data });
  return NextResponse.json({ success: true, image });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.images.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
