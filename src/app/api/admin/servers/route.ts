import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';
import { queueer } from '@/lib/queueer';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description, nodeId, imageId, ownerId, port, Memory, Cpu, Storage, dockerImage, variables, allowStartupEdit } = body;

  if (!name || !nodeId || !imageId || !ownerId || !port) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const [node, image] = await Promise.all([
    prisma.node.findUnique({ where: { id: parseInt(nodeId, 10) } }),
    prisma.images.findUnique({ where: { id: parseInt(imageId, 10) } }),
  ]);

  if (!node) return NextResponse.json({ error: 'Node not found.' }, { status: 404 });
  if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });

  const portNum = parseInt(String(port).split(':')[0], 10);

  // Check port not already in use on this node
  const existingServers = await prisma.server.findMany({ where: { nodeId: node.id } });
  for (const s of existingServers) {
    try {
      const ports = JSON.parse(s.Ports);
      if (ports.some((p: any) => parseInt(String(p.Port).split(':')[0], 10) === portNum)) {
        return NextResponse.json({ error: `Port ${portNum} is already in use.` }, { status: 400 });
      }
    } catch { /* skip */ }
  }

  const dockerImages: Record<string, string>[] = (() => { try { return JSON.parse(image.dockerImages ?? '[]'); } catch { return []; } })();
  const imageDocker = dockerImages.find((d) => Object.keys(d).includes(dockerImage));
  if (!imageDocker) return NextResponse.json({ error: 'Docker image variant not found.' }, { status: 400 });

  // Merge submitted variable values
  const imageVars: any[] = (() => { try { return JSON.parse(image.variables ?? '[]'); } catch { return []; } })();
  const submitted: any[] = Array.isArray(variables) ? variables : [];
  const mergedVars = imageVars.map((v: any) => {
    const key = String(v.env_variable ?? v.env ?? '');
    const sub = submitted.find((s: any) => String(s.env_variable ?? s.env ?? '') === key);
    return { ...v, value: sub?.value ?? v.default_value ?? '' };
  });

  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      ownerId: parseInt(ownerId, 10),
      nodeId: node.id,
      imageId: image.id,
      Ports: JSON.stringify([{ Port: portNum, primary: true }]),
      Memory: parseInt(Memory, 10) || 1024,
      Cpu: parseInt(Cpu, 10) || 100,
      Storage: parseInt(Storage, 10) || 20,
      Variables: JSON.stringify(mergedVars),
      StartCommand: image.startup ?? '',
      dockerImage: JSON.stringify(imageDocker),
      Installing: true,
      Queued: true,
    },
  });

  await prisma.$executeRaw`UPDATE "Server" SET "allowStartupEdit" = ${allowStartupEdit === true} WHERE "id" = ${server.id}`;

  queueer.addTask(async () => {
    try {
      const env: Record<string, string> = {};
      mergedVars.forEach((v: any) => { const k = v.env_variable || v.env; if (k) env[k] = String(v.value ?? v.default_value ?? ''); });
      env['SERVER_PORT'] = String(portNum);
      env['SERVER_MEMORY'] = String(server.Memory);
      env['SERVER_CPU'] = String(server.Cpu);

      const dockerImageValue = Object.values(imageDocker)[0] as string;
      await axios({
        method: 'POST',
        url: `${daemonSchemeSync()}://${node.address}:${node.port}/container/create`,
        auth: { username: 'Airlink', password: node.key },
        data: {
          id: server.UUID,
          image: dockerImageValue,
          ports: portNum,
          Memory: server.Memory,
          Cpu: server.Cpu,
          Storage: server.Storage,
          env,
          scripts: image.scripts ? JSON.parse(image.scripts) : {},
        },
        timeout: 60000,
      });
    } catch (err) {
      console.error('Daemon container create failed:', err);
    }
  });

  return NextResponse.json({ success: true, UUID: server.UUID });
}
