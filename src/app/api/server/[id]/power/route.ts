import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

function getPrimaryPort(portsJson: string): number | undefined {
  try {
    const ports = JSON.parse(portsJson);
    return ports.filter((p: any) => p.primary).map((p: any) => p.Port).pop();
  } catch { return undefined; }
}

function buildEnvVariables(variables: string | null): Record<string, string> {
  if (!variables) return {};
  try {
    const vars = JSON.parse(variables);
    const env: Record<string, string> = {};
    for (const v of vars) {
      const key = v.env_variable || v.env;
      if (!key) continue;
      env[key] = String(v.value !== undefined ? v.value : (v.default_value ?? ''));
    }
    return env;
  } catch { return {}; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;

  if (!['start', 'stop', 'restart', 'kill'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true, image: true },
  });
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (server.Suspended && action === 'start') {
    return NextResponse.json({ error: 'Server is suspended.' }, { status: 403 });
  }

  const { node } = server;
  const scheme = daemonSchemeSync();

  try {
    if (action === 'stop') {
      await axios({
        method: 'POST',
        url: `${scheme}://${node.address}:${node.port}/container/stop`,
        auth: { username: 'Airlink', password: node.key },
        data: { id, stopCmd: server.image?.stop || 'stop' },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'kill') {
      await axios({
        method: 'POST',
        url: `${scheme}://${node.address}:${node.port}/container/kill`,
        auth: { username: 'Airlink', password: node.key },
        data: { id },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'restart') {
      try {
        await axios({
          method: 'POST',
          url: `${scheme}://${node.address}:${node.port}/container/stop`,
          auth: { username: 'Airlink', password: node.key },
          data: { id, stopCmd: server.image?.stop || 'stop' },
        });
      } catch { /* already stopped */ }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // start / restart share the same start logic
    const port = getPrimaryPort(server.Ports);
    const env = buildEnvVariables(server.Variables);
    env['SERVER_PORT'] = String(port ?? '');
    env['SERVER_MEMORY'] = String(server.Memory);
    env['SERVER_CPU'] = String(server.Cpu);

    if (!server.dockerImage) return NextResponse.json({ error: 'No docker image.' }, { status: 400 });
    const image = Object.values(JSON.parse(server.dockerImage))[0];

    await axios({
      method: 'POST',
      url: `${scheme}://${node.address}:${node.port}/container/start`,
      auth: { username: 'Airlink', password: node.key },
      data: { id, image: String(image), ports: port, Memory: server.Memory, Cpu: server.Cpu, env, StartCommand: server.StartCommand },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed' }, { status: 500 });
  }
}
