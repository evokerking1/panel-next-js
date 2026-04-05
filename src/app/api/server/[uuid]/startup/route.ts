import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildDaemonUrl } from '@/lib/daemon';
import { getPrimaryPortBindingFromJson, getPrimaryPortFromJson } from '@/lib/server/server-ports';
import axios from 'axios';
import { daemonAuth, getAccessibleServer } from '@/lib/api/server-access';
import {
  buildServerEnvVariables,
  parseJsonArray,
  parseVariableEntries,
  resolveDockerImageValue,
} from '@/lib/server/container-config';

async function restartIfRunning(
  server: Awaited<ReturnType<typeof prisma.server.findUnique>> & {
    node: { address: string; port: number; key: string };
    image: { stop?: string | null } | null;
  },
  newStartCommand?: string,
  newVariables?: string,
) {
  if (!server) return;
  const base = await buildDaemonUrl(server.node.address, server.node.port);
  const auth = daemonAuth(server.node.key);
  try {
    const { data } = await axios.get(`${base}/container/status`, { params: { id: server.UUID }, auth, timeout: 4000 });
    if (!data?.running) return;
    await axios.post(`${base}/container/stop`, { id: server.UUID, stopCmd: server.image?.stop || 'stop' }, { auth, timeout: 8000 });
    await new Promise(r => setTimeout(r, 2000));
    const portNumber = getPrimaryPortFromJson(server.Ports);
    const ports = getPrimaryPortBindingFromJson(server.Ports);
    const vars = newVariables ?? server.Variables;
    const env = buildServerEnvVariables(vars);
    env['SERVER_PORT'] = String(portNumber ?? '');
    env['SERVER_MEMORY'] = String(server.Memory);
    env['SERVER_CPU'] = String(server.Cpu);
    await axios.post(`${base}/container/start`, {
      id: server.UUID,
      image: resolveDockerImageValue(server.dockerImage),
      ports,
      Memory: server.Memory,
      Cpu: server.Cpu,
      env,
      StartCommand: newStartCommand ?? server.StartCommand,
    }, { auth, timeout: 30000 });
  } catch {}
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getAccessibleServer(req, uuid, { node: true, image: true });
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { server } = result;

  const variables = parseVariableEntries(server.Variables);
  const dockerImages = parseJsonArray<Record<string, string>>(server.image?.dockerImages);

  return NextResponse.json({
    server,
    variables,
    dockerImages,
    currentDockerImage: resolveDockerImageValue(server.dockerImage),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const result = await getAccessibleServer(req, uuid, { node: true, image: true });
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
    const selectedDockerImage = String(body.dockerImage ?? '').trim();
    if (!selectedDockerImage) {
      return NextResponse.json({ error: 'Docker image is required.' }, { status: 400 });
    }

    const dockerImages = parseJsonArray<Record<string, string>>(server.image?.dockerImages);

    const matchedImage = dockerImages.find(entry =>
      Object.values(entry).some(value => String(value) === selectedDockerImage),
    );

    if (!matchedImage) {
      return NextResponse.json({ error: 'Selected Docker image is invalid.' }, { status: 400 });
    }

    await prisma.server.update({
      where: { UUID: uuid },
      data: { dockerImage: JSON.stringify(matchedImage) },
    });
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
