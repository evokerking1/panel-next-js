import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { daemonGet, daemonPost, daemonUrl } from '@/lib/daemon';
import axios from 'axios';

async function getServerAndUser(req: NextRequest, uuid: string) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return { error: 'Unauthorized', status: 401 };

  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true, image: true, owner: true },
  });
  if (!server) return { error: 'Server not found.', status: 404 };

  const isOwner = server.ownerId === session.user.id;
  const isAdmin = session.user.isAdmin;
  if (!isOwner && !isAdmin) return { error: 'Forbidden.', status: 403 };

  return { server, user: session.user };
}

function buildEnvVariables(variablesJson: string | null): Record<string, string> {
  if (!variablesJson) return {};
  try {
    const vars = JSON.parse(variablesJson);
    const env: Record<string, string> = {};
    for (const v of vars) {
      const key = v.env_variable || v.env;
      if (key) env[key] = String(v.value ?? v.default_value ?? '');
    }
    return env;
  } catch {
    return {};
  }
}

function getPrimaryPort(portsJson: string): number | undefined {
  try {
    const ports = JSON.parse(portsJson);
    return ports.filter((p: { primary: boolean }) => p.primary).map((p: { Port: number }) => p.Port).pop();
  } catch {
    return undefined;
  }
}

// GET /api/server/[uuid] — server info + status
export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;

  let serverStatus = { online: false, starting: false, stopping: false, uptime: null as number | null };
  try {
    const statusData = await daemonGet<{ running?: boolean; uptime?: number }>(
      server.node.address, server.node.port, server.node.key,
      '/container/status', { id: server.UUID }
    );
    serverStatus = {
      online: statusData.running === true,
      starting: false,
      stopping: false,
      uptime: statusData.uptime ?? null,
    };
  } catch {
    serverStatus = { online: false, starting: false, stopping: false, uptime: null };
  }

  const features: string[] = (() => {
    try {
      const info = JSON.parse(server.image?.info || '{}');
      return Array.isArray(info?.features) ? info.features : [];
    } catch { return []; }
  })();

  return NextResponse.json({ server, serverStatus, features });
}

// POST /api/server/[uuid] — power actions
export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { server } = result;
  const body = await req.json().catch(() => ({}));
  const { action, command } = body;

  if (action === 'command') {
    if (!command) return NextResponse.json({ error: 'Command is required.' }, { status: 400 });
    await daemonPost(server.node.address, server.node.port, server.node.key, '/container/command', {
      id: server.UUID,
      command,
    });
    return NextResponse.json({ success: true });
  }

  if (action === 'stop') {
    try {
      await axios.post(
        `${daemonUrl(server.node.address, server.node.port)}/container/stop`,
        { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
        { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 }
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return NextResponse.json({ success: true, message: 'Already stopped.' });
      }
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'restart') {
    try {
      await axios.post(
        `${daemonUrl(server.node.address, server.node.port)}/container/stop`,
        { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
        { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 }
      );
    } catch {}

    await new Promise(r => setTimeout(r, 2000));

    const primaryPort = getPrimaryPort(server.Ports);
    const envVars = buildEnvVariables(server.Variables);
    envVars['SERVER_PORT'] = String(primaryPort ?? '');
    envVars['SERVER_MEMORY'] = String(server.Memory);
    envVars['SERVER_CPU'] = String(server.Cpu);

    await axios.post(
      `${daemonUrl(server.node.address, server.node.port)}/container/start`,
      { id: server.UUID, image: server.dockerImage, ports: primaryPort, Memory: server.Memory, Cpu: server.Cpu, env: envVars, StartCommand: server.StartCommand },
      { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 }
    );
    return NextResponse.json({ success: true });
  }

  if (action === 'start') {
    if (server.Suspended) return NextResponse.json({ error: 'Server is suspended.' }, { status: 403 });

    const primaryPort = getPrimaryPort(server.Ports);
    const envVars = buildEnvVariables(server.Variables);
    envVars['SERVER_PORT'] = String(primaryPort ?? '');
    envVars['SERVER_MEMORY'] = String(server.Memory);
    envVars['SERVER_CPU'] = String(server.Cpu);

    await axios.post(
      `${daemonUrl(server.node.address, server.node.port)}/container/start`,
      { id: server.UUID, image: server.dockerImage, ports: primaryPort, Memory: server.Memory, Cpu: server.Cpu, env: envVars, StartCommand: server.StartCommand },
      { auth: { username: 'Airlink', password: server.node.key }, timeout: 8000 }
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
