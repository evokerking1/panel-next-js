import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import axios from 'axios';
import { daemonUrl } from '@/lib/daemon';
import { Buffer } from 'buffer';

function pickAvailablePort(allocated: number[], used: number[]): number | null {
  for (const port of allocated) {
    if (!used.includes(port)) return port;
  }
  return null;
}

function usedPortsOnNode(servers: { Ports: string }[]): number[] {
  const used: number[] = [];
  for (const s of servers) {
    try {
      const ports = JSON.parse(s.Ports);
      for (const p of ports) {
        const n = parseInt(String(p.Port).split(':')[0]);
        if (!isNaN(n)) used.push(n);
      }
    } catch {}
  }
  return used;
}

async function getSessionUser(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  return session.user ?? null;
}

// GET — return nodes, images, limits so the page can render the form
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, settings] = await Promise.all([
    prisma.users.findUnique({ where: { id: sessionUser.id } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!settings?.allowUserCreateServer) {
    return NextResponse.json({ error: 'Server creation is disabled.' }, { status: 403 });
  }

  const serverLimit = user.serverLimit ?? settings?.defaultServerLimit ?? 0;
  if (serverLimit === 0) {
    return NextResponse.json({ error: 'You are not allowed to create servers.' }, { status: 403 });
  }

  const currentCount = await prisma.server.count({ where: { ownerId: user.id } });
  if (currentCount >= serverLimit) {
    return NextResponse.json({ error: `Server limit of ${serverLimit} reached.` }, { status: 403 });
  }

  const [nodes, images] = await Promise.all([
    prisma.node.findMany(),
    prisma.images.findMany(),
  ]);

  return NextResponse.json({
    nodes,
    images,
    serverLimit,
    currentCount,
    resourceLimits: {
      maxMemory:  user.maxMemory  ?? settings?.defaultMaxMemory  ?? 512,
      maxCpu:     user.maxCpu     ?? settings?.defaultMaxCpu     ?? 100,
      maxStorage: user.maxStorage ?? settings?.defaultMaxStorage ?? 5,
    },
  });
}

// POST — create the server
export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user, settings] = await Promise.all([
    prisma.users.findUnique({ where: { id: sessionUser.id } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!settings?.allowUserCreateServer) {
    return NextResponse.json({ error: 'Server creation is disabled.' }, { status: 403 });
  }

  const serverLimit = user.serverLimit ?? settings?.defaultServerLimit ?? 0;
  if (serverLimit === 0) {
    return NextResponse.json({ error: 'You are not allowed to create servers.' }, { status: 403 });
  }

  const currentCount = await prisma.server.count({ where: { ownerId: user.id } });
  if (currentCount >= serverLimit) {
    return NextResponse.json({ error: `Server limit of ${serverLimit} reached.` }, { status: 403 });
  }

  const maxMemory  = user.maxMemory  ?? settings?.defaultMaxMemory  ?? 512;
  const maxCpu     = user.maxCpu     ?? settings?.defaultMaxCpu     ?? 100;
  const maxStorage = user.maxStorage ?? settings?.defaultMaxStorage ?? 5;

  const body = await req.json().catch(() => ({}));
  const { name, description, nodeId, imageId, dockerImage, Memory, Cpu, Storage } = body;

  if (!name || !nodeId || !imageId || !dockerImage || !Memory || !Cpu || !Storage) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const memory  = parseInt(Memory);
  const cpu     = parseInt(Cpu);
  const storage = parseInt(Storage);

  if (isNaN(memory)  || memory  < 128 || memory  > maxMemory)  return NextResponse.json({ error: `Memory must be 128–${maxMemory} MB.` },    { status: 400 });
  if (isNaN(cpu)     || cpu     < 50  || cpu     > maxCpu)     return NextResponse.json({ error: `CPU must be 50–${maxCpu}%.` },               { status: 400 });
  if (isNaN(storage) || storage < 1   || storage > maxStorage) return NextResponse.json({ error: `Storage must be 1–${maxStorage} GB.` },      { status: 400 });

  const node = await prisma.node.findUnique({ where: { id: parseInt(nodeId) } });
  if (!node) return NextResponse.json({ error: 'Node not found.' }, { status: 400 });

  let allocatedPorts: number[] = [];
  try { allocatedPorts = JSON.parse(node.allocatedPorts ?? '[]'); } catch {
    return NextResponse.json({ error: 'Node port configuration is invalid.' }, { status: 500 });
  }

  const existingServers = await prisma.server.findMany({ where: { nodeId: node.id } });
  const assignedPort = pickAvailablePort(allocatedPorts, usedPortsOnNode(existingServers));
  if (!assignedPort) return NextResponse.json({ error: 'No available ports on the selected node.' }, { status: 503 });

  const image = await prisma.images.findUnique({ where: { id: parseInt(imageId) } });
  if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 400 });

  let dockerImages: any[] = [];
  try { dockerImages = JSON.parse(image.dockerImages ?? '[]'); } catch {
    return NextResponse.json({ error: 'Image docker configuration is invalid.' }, { status: 500 });
  }

  const imageDocker = dockerImages.find((img: any) => Object.keys(img).includes(dockerImage));
  if (!imageDocker) return NextResponse.json({ error: 'Docker image variant not found.' }, { status: 400 });

  if (!image.startup) return NextResponse.json({ error: 'Image has no startup command.' }, { status: 500 });

  let imageVariables: any[] = [];
  try { imageVariables = JSON.parse(image.variables ?? '[]'); } catch { imageVariables = []; }

  const portsJson = JSON.stringify([{ Port: `${assignedPort}:${assignedPort}`, primary: true }]);

  const created = await prisma.server.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ownerId: user.id,
      nodeId: node.id,
      imageId: image.id,
      Ports: portsJson,
      Memory: memory,
      Cpu: cpu,
      Storage: storage,
      Variables: JSON.stringify(imageVariables),
      StartCommand: image.startup,
      dockerImage: JSON.stringify(imageDocker),
    },
  });

  // Kick off installation in the background — don't await
  installServer(created, node, image, imageVariables, assignedPort).catch(() => {});

  return NextResponse.json({ success: true, serverUUID: created.UUID });
}

async function installServer(server: any, node: any, image: any, imageVariables: any[], assignedPort: number) {
  const serverEnv = imageVariables.map((v: any) => ({
    env:   String(v.env_variable ?? v.env ?? ''),
    value: v.value ?? v.default_value ?? '',
  }));
  serverEnv.push({ env: 'SERVER_PORT',   value: String(assignedPort) });
  serverEnv.push({ env: 'SERVER_MEMORY', value: String(server.Memory) });
  serverEnv.push({ env: 'SERVER_CPU',    value: String(server.Cpu) });

  const env = serverEnv.reduce((acc: any, curr: any) => { acc[curr.env] = curr.value; return acc; }, {});
  const authHeader = `Basic ${Buffer.from(`Airlink:${node.key}`).toString('base64')}`;
  const base = daemonUrl(node.address, node.port);

  if (!image.scripts) return;
  let scripts: any = {};
  try { scripts = JSON.parse(image.scripts); } catch { return; }

  try {
    if (scripts.installation && typeof scripts.installation === 'object') {
      const inst = scripts.installation as { script: string; container: string; entrypoint: string };
      await axios.post(
        `${base}/container/installer`,
        { id: server.UUID, script: inst.script, container: inst.container, entrypoint: inst.entrypoint || 'bash', env },
        { headers: { 'Content-Type': 'application/json', Authorization: authHeader }, timeout: 600000 }
      );
    } else if (Array.isArray(scripts.install)) {
      let dockerImageValue: string | undefined;
      try {
        const parsed = JSON.parse(server.dockerImage ?? '{}');
        dockerImageValue = Object.values(parsed)[0] as string | undefined;
      } catch {}

      await axios.post(
        `${base}/container/install`,
        {
          id: server.UUID,
          image: dockerImageValue,
          env,
          scripts: (scripts.install as any[]).map((s: any) => ({
            url: s.url, onStartup: s.onStart, ALVKT: s.ALVKT, fileName: s.fileName,
          })),
        },
        { headers: { 'Content-Type': 'application/json', Authorization: authHeader }, timeout: 600000 }
      );
    }
    await prisma.server.update({ where: { id: server.id }, data: { Queued: false } });
  } catch {}
}
