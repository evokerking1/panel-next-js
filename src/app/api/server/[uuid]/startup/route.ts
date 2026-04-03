import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { daemonUrl } from '@/lib/daemon';
import axios from 'axios';

async function getServerAndUser(req: NextRequest, uuid: string) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user) return { error: 'Unauthorized', status: 401 };
  const server = await prisma.server.findUnique({
    where: { UUID: uuid },
    include: { node: true, image: true },
  });
  if (!server) return { error: 'Not found.', status: 404 };
  if (server.ownerId !== session.user.id && !session.user.isAdmin) return { error: 'Forbidden.', status: 403 };
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
  } catch { return {}; }
}

async function restartIfRunning(
  server: Awaited<ReturnType<typeof prisma.server.findUnique>> & {
    node: { address: string; port: number; key: string };
    image: { stop?: string | null } | null;
  },
  newStartCommand?: string,
  newVariables?: string,
) {
  if (!server) return;
  const base = daemonUrl(server.node.address, server.node.port);
  const auth = { username: 'Airlink', password: server.node.key };
  try {
    const { data } = await axios.get(`${base}/container/status`, { params: { id: server.UUID }, auth, timeout: 4000 });
    if (!data?.running) return;
    await axios.post(`${base}/container/stop`, { id: server.UUID, stopCmd: server.image?.stop || 'stop' }, { auth, timeout: 8000 });
    await new Promise(r => setTimeout(r, 2000));
    const ports = JSON.parse(server.Ports).filter((p: { primary: boolean }) => p.primary).map((p: { Port: number }) => p.Port).pop();
    const vars = newVariables ?? server.Variables;
    const env = buildEnvVariables(vars);
    env['SERVER_PORT'] = String(ports ?? '');
    env['SERVER_MEMORY'] = String(server.Memory);
    env['SERVER_CPU'] = String(server.Cpu);
    await axios.post(`${base}/container/start`, {
      id: server.UUID,
      image: server.dockerImage,
      ports,
      Memory: server.Memory,
      Cpu: server.Cpu,
      env,
      StartCommand: newStartCommand ?? server.StartCommand,
    }, { auth, timeout: 8000 });
  } catch {}
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { server } = result;

  let variables = [];
  try { variables = JSON.parse(server.Variables || '[]'); } catch {}

  let dockerImages: Record<string, string>[] = [];
  try { dockerImages = JSON.parse(server.image?.dockerImages || '[]'); } catch {}

  return NextResponse.json({ server, variables, dockerImages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getServerAndUser(req, uuid);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { server } = result;

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === 'update-command') {
    if (!server.allowStartupEdit) {
      return NextResponse.json({ error: 'Startup editing is not allowed for this server.' }, { status: 403 });
    }
    const { startCommand } = body;
    try {
      await prisma.server.update({ where: { UUID: uuid }, data: { StartCommand: startCommand } });
      await restartIfRunning(server as Parameters<typeof restartIfRunning>[0], startCommand);
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  if (action === 'update-docker-image') {
    const { dockerImage } = body;
    await prisma.server.update({ where: { UUID: uuid }, data: { dockerImage } });
    return NextResponse.json({ success: true });
  }

  if (action === 'update-variables') {
    const { variables } = body;
    const varJson = JSON.stringify(variables);
    try {
      await prisma.server.update({ where: { UUID: uuid }, data: { Variables: varJson } });
      await restartIfRunning(server as Parameters<typeof restartIfRunning>[0], undefined, varJson);
      return NextResponse.json({ success: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Daemon request failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
