import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { daemonUrl } from '@/lib/daemon';

async function getServerAndUser(req: NextRequest, uuid: string) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return { error: 'Unauthorized', status: 401 };

  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true },
  });
  if (!server) return { error: 'Not found.', status: 404 };
  if (server.ownerId !== session.user.id && !session.user.isAdmin) return { error: 'Forbidden.', status: 403 };

  return { server };
}

const auth = (key: string) => ({ username: 'Airlink', password: key });

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';
  const path = url.searchParams.get('path') || '/';

  const base = daemonUrl(server.node.address, server.node.port);

  if (action === 'list') {
    const { data } = await axios.get(`${base}/fs/list`, {
      params: { id: uuid, path },
      auth: auth(server.node.key),
      timeout: 8000,
    });
    let files = typeof data === 'string' ? JSON.parse(data) : data;
    files = (files as Array<{ name: string; type: string }>)
      .filter(f => f.name !== 'airlink')
      .sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return 0;
      });
    return NextResponse.json({ files });
  }

  if (action === 'read') {
    const filePath = url.searchParams.get('filePath') || '';
    const { data } = await axios.get(`${base}/fs/read`, {
      params: { id: uuid, path: filePath },
      auth: auth(server.node.key),
      timeout: 8000,
    });
    return NextResponse.json({ content: data });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const body = await req.json().catch(() => ({}));
  const { action, path, content, newName } = body;

  const base = daemonUrl(server.node.address, server.node.port);

  if (action === 'write') {
    await axios.post(`${base}/fs/write`, { id: uuid, path, content },
      { auth: auth(server.node.key), timeout: 10000 }
    );
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    await axios.delete(`${base}/fs/delete`, {
      data: { id: uuid, path },
      auth: auth(server.node.key),
      timeout: 8000,
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'rename') {
    await axios.post(`${base}/fs/rename`, { id: uuid, path, newName },
      { auth: auth(server.node.key), timeout: 8000 }
    );
    return NextResponse.json({ success: true });
  }

  if (action === 'mkdir') {
    await axios.post(`${base}/fs/mkdir`, { id: uuid, path },
      { auth: auth(server.node.key), timeout: 8000 }
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const body = await req.json().catch(() => ({}));
  const { path } = body;

  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'Path is required.' }, { status: 400 });
  }

  const base = daemonUrl(server.node.address, server.node.port);

  await axios.delete(`${base}/fs/delete`, {
    data: { id: uuid, path },
    auth: auth(server.node.key),
    timeout: 8000,
  });

  return NextResponse.json({ success: true });
}
