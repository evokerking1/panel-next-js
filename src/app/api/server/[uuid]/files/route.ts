import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';
import { daemonAuth, getAccessibleServer, parseSafePath } from '@/lib/api/server-access';

function parsePathOrError(value: string, message = 'Invalid path.') {
  try {
    return { path: parseSafePath(value) };
  } catch {
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }
}

function daemonErrorResponse(error: unknown, fallback = 'Daemon request failed') {
  const message = axios.isAxiosError(error) ? error.response?.data?.error || error.message : fallback;
  return NextResponse.json({ error: message }, { status: 502 });
}

async function listFiles(base: string, uuid: string, key: string, path: string) {
  const { data } = await axios.get(`${base}/fs/list`, {
    params: { id: uuid, path },
    auth: daemonAuth(key),
    timeout: 8000,
  });

  let files = typeof data === 'string' ? JSON.parse(data) : data;
  files = (files as Array<{ name: string; type: string }>)
    .filter((file) => file.name !== 'airlink')
    .sort((left, right) => {
      if (left.type === 'directory' && right.type === 'file') return -1;
      if (left.type === 'file' && right.type === 'directory') return 1;
      return 0;
    });

  return NextResponse.json({ files });
}

async function readFile(base: string, uuid: string, key: string, filePath: string) {
  const { data } = await axios.get(`${base}/fs/file/content`, {
    params: { id: uuid, path: filePath },
    auth: daemonAuth(key),
    timeout: 8000,
  });

  const content = typeof data === 'string'
    ? data
    : typeof data?.content === 'string'
      ? data.content
      : JSON.stringify(data ?? '', null, 2);

  return NextResponse.json({ content });
}

async function downloadFile(base: string, uuid: string, key: string, filePath: string) {
  const response = await axios.get(`${base}/fs/download`, {
    params: { id: uuid, path: filePath },
    auth: daemonAuth(key),
    responseType: 'stream',
    timeout: 30000,
  });

  const fileName = filePath.split('/').pop() || 'download';
  return new NextResponse(response.data, {
    headers: {
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
    },
  });
}

async function uploadFile(req: NextRequest, uuid: string) {
  const result = await getAccessibleServer(req, uuid, { node: true });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { server } = result;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const uploadPathRaw = (formData.get('uploadPath') as string) || '';
  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const parsed = parsePathOrError(uploadPathRaw + file.name);
  if ('error' in parsed) {
    return parsed.error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', buffer, { filename: file.name, contentType: file.type || 'application/octet-stream' });
  form.append('id', uuid);
  form.append('path', parsed.path);

  const base = await buildDaemonUrl(server.node.address, server.node.port);
  await axios.post(`${base}/fs/upload`, form, {
    headers: form.getHeaders(),
    auth: daemonAuth(server.node.key),
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return NextResponse.json({ success: true });
}

async function mutateFileSystem(
  action: string,
  base: string,
  uuid: string,
  key: string,
  path: string,
  body: Record<string, unknown>,
) {
  if (action === 'write') {
    await axios.post(`${base}/fs/file/content`, { id: uuid, path, content: body.content }, {
      auth: daemonAuth(key),
      timeout: 10000,
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'delete') {
    await axios.delete(`${base}/fs/rm`, {
      data: { id: uuid, path },
      auth: daemonAuth(key),
      timeout: 8000,
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'rename') {
    const target = parsePathOrError(String(body.newName || ''), 'Invalid target path.');
    if ('error' in target) {
      return target.error;
    }
    if (!target.path) {
      return NextResponse.json({ error: 'Target path is required.' }, { status: 400 });
    }

    await axios.post(`${base}/fs/rename`, { id: uuid, path, newName: target.path, newPath: target.path }, {
      auth: daemonAuth(key),
      timeout: 8000,
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'mkdir') {
    await axios.post(`${base}/fs/mkdir`, { id: uuid, path }, {
      auth: daemonAuth(key),
      timeout: 8000,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getAccessibleServer(req, uuid, { node: true });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';

  const base = await buildDaemonUrl(server.node.address, server.node.port);

  if (action === 'list') {
    const rawPath = url.searchParams.get('path') || '/';
    const parsed = parsePathOrError(rawPath);
    if ('error' in parsed) return parsed.error;
    try {
      return await listFiles(base, uuid, server.node.key, parsed.path);
    } catch (err) {
      return daemonErrorResponse(err);
    }
  }

  if (action === 'read') {
    const rawPath = url.searchParams.get('filePath') || '';
    const parsed = parsePathOrError(rawPath);
    if ('error' in parsed) return parsed.error;
    try {
      return await readFile(base, uuid, server.node.key, parsed.path);
    } catch (err) {
      return daemonErrorResponse(err);
    }
  }

  if (action === 'download') {
    const rawPath = url.searchParams.get('filePath') || '';
    const parsed = parsePathOrError(rawPath);
    if ('error' in parsed) return parsed.error;
    try {
      return await downloadFile(base, uuid, server.node.key, parsed.path);
    } catch (err) {
      return daemonErrorResponse(err);
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    try {
      return await uploadFile(req, uuid);
    } catch (err) {
      return daemonErrorResponse(err, 'Upload failed');
    }
  }

  const result = await getAccessibleServer(req, uuid, { node: true });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const body = await req.json().catch(() => ({}));
  const { action, newName } = body;

  const parsed = parsePathOrError(String(body.path || ''));
  if ('error' in parsed) return parsed.error;

  const base = await buildDaemonUrl(server.node.address, server.node.port);
  try {
    return await mutateFileSystem(action, base, uuid, server.node.key, parsed.path, { ...body, newName });
  } catch (err) {
    return daemonErrorResponse(err);
  }
}
