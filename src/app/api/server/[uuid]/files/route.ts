import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';

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

function safePath(p: string): string {
  const normalized = p.replace(/\0/g, '').replace(/\\/g, '/');
  if (normalized.includes('../')) {
    throw new Error('Invalid path');
  }
  return normalized;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';

  const base = await buildDaemonUrl(server.node.address, server.node.port);

  if (action === 'list') {
    const rawPath = url.searchParams.get('path') || '/';
    let path: string;
    try { path = safePath(rawPath); } catch {
      return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
    }
    try {
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
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'read') {
    const rawPath = url.searchParams.get('filePath') || '';
    let filePath: string;
    try { filePath = safePath(rawPath); } catch {
      return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
    }
    try {
      const { data } = await axios.get(`${base}/fs/file/content`, {
        params: { id: uuid, path: filePath },
        auth: auth(server.node.key),
        timeout: 8000,
      });
      return NextResponse.json({ content: data });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'download') {
    const rawPath = url.searchParams.get('filePath') || '';
    let filePath: string;
    try { filePath = safePath(rawPath); } catch {
      return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
    }
    try {
      const resp = await axios.get(`${base}/fs/download`, {
        params: { id: uuid, path: filePath },
        auth: auth(server.node.key),
        responseType: 'stream',
        timeout: 30000,
      });
      const fileName = filePath.split('/').pop() || 'download';
      return new NextResponse(resp.data, {
        headers: {
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Type': resp.headers['content-type'] || 'application/octet-stream',
        },
      });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const result2 = await getServerAndUser(req, uuid);
    if ('error' in result2) return NextResponse.json({ error: result2.error }, { status: result2.status });
    const { server: srv } = result2;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadPathRaw = (formData.get('uploadPath') as string) || '/';
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    let uploadFilePath: string;
    try { uploadFilePath = safePath(uploadPathRaw + file.name); } catch {
      return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const FormData = (await import('form-data')).default;
    const axFd = new FormData();
    axFd.append('file', buffer, { filename: file.name, contentType: file.type || 'application/octet-stream' });
    axFd.append('id', uuid);
    axFd.append('path', uploadFilePath);
    const base2 = await buildDaemonUrl(srv.node.address, srv.node.port);
    try {
      await axios.post(`${base2}/fs/upload`, axFd, {
        headers: axFd.getHeaders(),
        auth: auth(srv.node.key),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Upload failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const body = await req.json().catch(() => ({}));
  const { action, newName } = body;

  let path: string;
  try { path = safePath(body.path || ''); } catch {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
  }

  const base = await buildDaemonUrl(server.node.address, server.node.port);

  if (action === 'write') {
    const { content } = body;
    try {
      await axios.post(`${base}/fs/file/content`, { id: uuid, path, content }, {
        auth: auth(server.node.key),
        timeout: 10000,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'delete') {
    try {
      await axios.delete(`${base}/fs/rm`, {
        data: { id: uuid, path },
        auth: auth(server.node.key),
        timeout: 8000,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'rename') {
    try {
      await axios.post(`${base}/fs/rename`, { id: uuid, path, newName }, {
        auth: auth(server.node.key),
        timeout: 8000,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'mkdir') {
    try {
      await axios.post(`${base}/fs/mkdir`, { id: uuid, path }, {
        auth: auth(server.node.key),
        timeout: 8000,
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
