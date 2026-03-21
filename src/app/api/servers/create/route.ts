import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';
import { queueer } from '@/lib/queueer';

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const full = await prisma.users.findUnique({ where: { id: user.id } });
  if (!full) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.allowUserCreateServer && !full.isAdmin) {
    return NextResponse.json({ error: 'Server creation is not enabled.' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, nodeId, imageId, memory, cpu, storage } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Server name is required.' }, { status: 400 });

  const [node, image] = await Promise.all([
    prisma.node.findUnique({ where: { id: parseInt(nodeId, 10) } }),
    prisma.images.findUnique({ where: { id: parseInt(imageId, 10) } }),
  ]);

  if (!node) return NextResponse.json({ error: 'Node not found.' }, { status: 404 });
  if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });

  // Pick an available port from the node's allocated range
  const existingServers = await prisma.server.findMany({ where: { nodeId: node.id } });
  const usedPorts = existingServers.flatMap((s) => {
    try { return JSON.parse(s.Ports).map((p: any) => parseInt(String(p.Port).split(':')[0], 10)); }
    catch { return []; }
  });

  // Default port range 25565-25665
  const availablePort = Array.from({ length: 100 }, (_, i) => 25565 + i).find((p) => !usedPorts.includes(p));
  if (!availablePort) return NextResponse.json({ error: 'No available ports on this node.' }, { status: 400 });

  const dockerImages = (() => { try { return JSON.parse(image.dockerImages ?? '[]'); } catch { return []; } })();
  const primaryImage = Object.values(dockerImages[0] ?? {})[0] as string ?? '';

  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? null,
      Ports: JSON.stringify([{ Port: availablePort, primary: true }]),
      Memory: Math.min(parseInt(memory, 10), full.maxMemory ?? settings?.defaultMaxMemory ?? 512),
      Cpu: Math.min(parseInt(cpu, 10), full.maxCpu ?? settings?.defaultMaxCpu ?? 100),
      Storage: Math.min(parseInt(storage, 10), full.maxStorage ?? settings?.defaultMaxStorage ?? 5),
      Variables: image.variables ?? '[]',
      StartCommand: image.startup ?? '',
      dockerImage: image.dockerImages ?? '{}',
      ownerId: full.id,
      nodeId: node.id,
      imageId: image.id,
      Installing: true,
      Queued: true,
    },
  });

  queueer.addTask(async () => {
    try {
      await axios({
        method: 'POST',
        url: `${daemonSchemeSync()}://${node.address}:${node.port}/container/create`,
        auth: { username: 'Airlink', password: node.key },
        data: {
          id: server.UUID,
          image: primaryImage,
          ports: availablePort,
          Memory: server.Memory,
          Cpu: server.Cpu,
          Storage: server.Storage,
          variables: {},
          scripts: image.scripts ? JSON.parse(image.scripts) : {},
        },
        timeout: 60000,
      });
    } catch (err) {
      console.error('Failed to create container on daemon:', err);
    }
  });

  return NextResponse.json({ success: true, UUID: server.UUID });
}
