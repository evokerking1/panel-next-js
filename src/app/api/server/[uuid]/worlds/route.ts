import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { buildDaemonUrl } from '@/lib/daemon';
import { daemonAuth, getAccessibleServer } from '@/lib/api/server-access';

function isWorldDirectory(name: string) {
  const normalized = name.toLowerCase()
  return ['world', 'world_nether', 'world_the_end'].includes(normalized)
    || normalized.includes('world')
    || normalized.includes('nether')
    || normalized.includes('end')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getAccessibleServer(req, uuid, { node: true });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { server } = result;

  const base = await buildDaemonUrl(server.node.address, server.node.port);
  const auth = daemonAuth(server.node.key);

  try {
    const listRes = await axios.get(`${base}/fs/list`, {
      params: { id: uuid, path: '/' },
      auth,
      timeout: 8000,
    });

    let files = typeof listRes.data === 'string' ? JSON.parse(listRes.data) : listRes.data;
    files = Array.isArray(files) ? files : [];

    const worlds = files
      .filter((f: { name: string; type: string }) => {
        if (f.type !== 'directory') return false;
        if (f.name === 'airlink') return false;
        return isWorldDirectory(f.name);
      })
      .map((f: { name: string; type: string }) => ({ name: f.name, type: f.type }));

    return NextResponse.json({ worlds });
  } catch {
    return NextResponse.json({ worlds: [] });
  }
}
