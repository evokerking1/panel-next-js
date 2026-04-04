import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';
import { buildDaemonUrl, daemonGet, daemonInstallState, daemonPost, getDaemonErrorMessage } from '@/lib/daemon';
import { getPrimaryPortBindingFromJson, getPrimaryPortFromJson } from '@/lib/server/server-ports';
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

// GET /api/server/[uuid] — server info + status
export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  try {
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
    const result = await getServerAndUser(req, uuid);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const { server } = result;
    const body = await req.json().catch(() => ({}));
    const { action, command } = body;

    if (action === 'update-settings') {
      const { name: newName, description: newDesc } = body;
      if (!newName?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
      await prisma.server.update({
        where: { UUID: uuid },
        data: {
          name: String(newName).trim().slice(0, 64),
          description: newDesc ? String(newDesc).trim().slice(0, 128) || null : null,
        },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'command') {
      if (!command) return NextResponse.json({ error: 'Command is required.' }, { status: 400 });
      try {
        await daemonPost(server.node.address, server.node.port, server.node.key, '/container/command', {
          id: server.UUID,
          command,
        });
        return NextResponse.json({ success: true });
      } catch (error) {
        return NextResponse.json({ error: getDaemonErrorMessage(error, 'Failed to send command.') }, { status: 502 });
      }
    }

    if (action === 'stop') {
      const base = await buildDaemonUrl(server.node.address, server.node.port);
      void axios.post(
        `${base}/container/stop`,
        { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
        { auth: { username: 'Airlink', password: server.node.key }, timeout: 5000 }
      ).catch(() => {});
      return NextResponse.json({ success: true });
    }

    if (action === 'restart' || action === 'start') {
      if (action === 'start' && server.Suspended) {
        return NextResponse.json({ error: 'Server is suspended.' }, { status: 403 });
      }

      const base = await buildDaemonUrl(server.node.address, server.node.port);
      const auth = { username: 'Airlink', password: server.node.key };

      if (action === 'restart') {
        try {
          await axios.post(
            `${base}/container/stop`,
            { id: server.UUID, stopCmd: server.image?.stop || 'stop' },
            { auth, timeout: 5000 }
          );
        } catch {}

        await new Promise(r => setTimeout(r, 2000));
      }

      const primaryPort = getPrimaryPortFromJson(server.Ports);
      const primaryPortBinding = getPrimaryPortBindingFromJson(server.Ports);
      const envVars = buildEnvVariables(server.Variables);
      envVars['SERVER_PORT'] = String(primaryPort ?? '');
      envVars['SERVER_MEMORY'] = String(server.Memory);
      envVars['SERVER_CPU'] = String(server.Cpu);

      const image = (() => {
        try { return String(Object.values(JSON.parse(server.dockerImage ?? '{}'))[0] ?? '') }
        catch { return server.dockerImage ?? '' }
      })();

      try {
        await axios.post(
          `${base}/container/start`,
          { id: server.UUID, image, ports: primaryPortBinding ?? '', Memory: server.Memory, Cpu: server.Cpu, env: envVars, StartCommand: server.StartCommand },
          { auth, timeout: 30000 }
        );
        return NextResponse.json({ success: true });
      } catch (error) {
        return NextResponse.json({ error: getDaemonErrorMessage(error, `Failed to ${action} server.`) }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('[api/server] Failed to process server action:', error);
    return NextResponse.json({ error: 'Failed to process server action.' }, { status: 500 });
  }
}
