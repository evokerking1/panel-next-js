import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildDaemonUrl, daemonGet, daemonInstallState, daemonPost, getDaemonErrorMessage } from '@/lib/daemon';
import { getPrimaryPortBindingFromJson, getPrimaryPortFromJson } from '@/lib/server/server-ports';
import axios from 'axios';
import { daemonAuth, getAccessibleServer } from '@/lib/api/server-access';
import { buildServerEnvVariables, resolveDockerImageValue } from '@/lib/server/container-config';

async function updateServerSettings(uuid: string, body: Record<string, unknown>) {
  const newName = String(body.name || '').trim()
  const newDescription = body.description ? String(body.description).trim().slice(0, 128) || null : null

  if (!newName) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  await prisma.server.update({
    where: { UUID: uuid },
    data: {
      name: newName.slice(0, 64),
      description: newDescription,
    },
  })

  return NextResponse.json({ success: true })
}

async function sendServerCommand(server: any, command: string) {
  if (!command) {
    return NextResponse.json({ error: 'Command is required.' }, { status: 400 })
  }

  try {
    await daemonPost(server.node.address, server.node.port, server.node.key, '/container/command', {
      id: server.UUID,
      command,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getDaemonErrorMessage(error, 'Failed to send command.') }, { status: 502 })
  }
}

async function stopServer(server: any) {
  const base = await buildDaemonUrl(server.node.address, server.node.port)
  void axios.post(
    `${base}/container/stop`,
    { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
    { auth: daemonAuth(server.node.key), timeout: 5000 },
  ).catch(() => {})
  return NextResponse.json({ success: true })
}

async function startOrRestartServer(server: any, action: 'start' | 'restart') {
  if (action === 'start' && server.Suspended) {
    return NextResponse.json({ error: 'Server is suspended.' }, { status: 403 })
  }

  const base = await buildDaemonUrl(server.node.address, server.node.port)
  const auth = daemonAuth(server.node.key)

  if (action === 'restart') {
    try {
      await axios.post(
        `${base}/container/stop`,
        { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
        { auth, timeout: 5000 },
      )
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const primaryPort = getPrimaryPortFromJson(server.Ports)
  const primaryPortBinding = getPrimaryPortBindingFromJson(server.Ports)
  const envVars = buildServerEnvVariables(server.Variables)
  envVars.SERVER_PORT = String(primaryPort ?? '')
  envVars.SERVER_MEMORY = String(server.Memory)
  envVars.SERVER_CPU = String(server.Cpu)

  try {
    await axios.post(
      `${base}/container/start`,
      {
        id: server.UUID,
        image: resolveDockerImageValue(server.dockerImage),
        ports: primaryPortBinding ?? '',
        Memory: server.Memory,
        Cpu: server.Cpu,
        env: envVars,
        StartCommand: server.StartCommand,
      },
      { auth, timeout: 30000 },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getDaemonErrorMessage(error, `Failed to ${action} server.`) }, { status: 502 })
  }
}

// GET /api/server/[uuid] — server info + status
export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    const { uuid } = await params;
    const result = await getAccessibleServer(req, uuid, { node: true, image: true, owner: true });
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

    let installState: string | null = null;
    try {
      installState = await daemonInstallState(
        server.node.address,
        server.node.port,
        server.node.key,
        server.UUID,
      );
    } catch {
      installState = null;
    }

    if (installState === 'installed' && (server.Installing || server.Queued)) {
      await prisma.server.update({
        where: { UUID: server.UUID },
        data: { Installing: false, Queued: false },
      });
      server.Installing = false;
      server.Queued = false;
    }

    if (installState && installState !== 'installed' && installState !== 'not_found') {
      server.Installing = true;
    }

    const features: string[] = (() => {
      try {
        const info = JSON.parse(server.image?.info || '{}');
        return Array.isArray(info?.features) ? info.features : [];
      } catch { return []; }
    })();

    return NextResponse.json({
      server,
      serverStatus,
      installState,
      installed: installState === 'installed' || (!server.Installing && !server.Queued),
      failed: installState === 'failed',
      daemonOffline: !serverStatus.online,
      features,
    });
  } catch (error) {
    console.error('[api/server] Failed to load server payload:', error);
    return NextResponse.json({ error: 'Failed to load server data.' }, { status: 500 });
  }
}

// POST /api/server/[uuid] — power actions
export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  try {
    const { uuid } = await params;
    const result = await getAccessibleServer(req, uuid, { node: true, image: true, owner: true });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const { server } = result;
    const body = await req.json().catch(() => ({}));
    const { action, command } = body;

    if (action === 'update-settings') {
      return updateServerSettings(uuid, body);
    }

    if (action === 'command') {
      return sendServerCommand(server, command);
    }

    if (action === 'stop') {
      return stopServer(server);
    }

    if (action === 'restart' || action === 'start') {
      return startOrRestartServer(server, action);
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('[api/server] Failed to process server action:', error);
    return NextResponse.json({ error: 'Failed to process server action.' }, { status: 500 });
  }
}
