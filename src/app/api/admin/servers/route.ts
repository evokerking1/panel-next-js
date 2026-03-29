import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { daemonPost } from '@/lib/daemon';
import axios from 'axios';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const servers = await prisma.server.findMany({
    include: { node: true, owner: true, image: true },
  });
  return NextResponse.json({ servers });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, description, nodeId, imageId, Ports, Memory, Cpu, Storage, dockerImage, variables, ownerId, allowStartupEdit } = body;

  if (!name || !nodeId || !imageId || !Ports || !Memory || !Cpu || !Storage || !ownerId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const node = await prisma.node.findUnique({ where: { id: parseInt(nodeId) } });
  if (!node) return NextResponse.json({ error: 'Node not found.' }, { status: 404 });

  const image = await prisma.images.findUnique({ where: { id: parseInt(imageId) } });
  if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });

  let parsedPorts: { primary: boolean; Port: number }[];
  try {
    parsedPorts = JSON.parse(Ports);
  } catch {
    return NextResponse.json({ error: 'Invalid ports format.' }, { status: 400 });
  }

  let dockerImages: string[] = [];
  try {
    const parsed = JSON.parse(image.dockerImages || '[]');
    dockerImages = Array.isArray(parsed) ? parsed.map((d: Record<string, string>) => Object.values(d)[0]).filter(Boolean) : [];
  } catch {
    dockerImages = [];
  }

  const finalDockerImage = dockerImage || dockerImages[0] || '';

  const server = await prisma.server.create({
    data: {
      name,
      description: description || '',
      nodeId: parseInt(nodeId),
      imageId: parseInt(imageId),
      ownerId: parseInt(ownerId),
      Ports: typeof Ports === 'string' ? Ports : JSON.stringify(Ports),
      Memory: parseInt(Memory),
      Cpu: parseInt(Cpu),
      Storage: parseInt(Storage),
      dockerImage: finalDockerImage,
      Variables: typeof variables === 'string' ? variables : JSON.stringify(variables || []),
      StartCommand: image.startup || '',
      allowStartupEdit: allowStartupEdit === true || allowStartupEdit === 'true',
      Installing: true,
      Queued: true,
    },
    include: { node: true, image: true },
  });

  try {
    let envVariables: Record<string, string> = {};
    try {
      const vars = JSON.parse(server.Variables || '[]');
      for (const v of vars) {
        const key = v.env_variable || v.env;
        if (key) envVariables[key] = String(v.value ?? v.default_value ?? '');
      }
    } catch {}

    const primaryPort = parsedPorts.find(p => p.primary)?.Port;

    await daemonPost(node.address, node.port, node.key, '/container/create', {
      id: server.UUID,
      Image: finalDockerImage,
      Env: envVariables,
      Scripts: {},
      Memory: server.Memory,
      Cpu: server.Cpu,
      Storage: server.Storage,
      StartupCmd: server.StartCommand,
      StopCmd: image.stop || 'stop',
      StartupDone: image.startup_done || '',
      Port: primaryPort,
      Ports: parsedPorts,
    });

    await prisma.server.update({
      where: { id: server.id },
      data: { Installing: false, Queued: false },
    });
  } catch (err) {
    const msg = axios.isAxiosError(err) ? err.response?.data?.message : String(err);
    return NextResponse.json({
      success: true,
      server,
      warning: 'Server created but daemon install failed: ' + msg,
    });
  }

  return NextResponse.json({ success: true, server });
}
