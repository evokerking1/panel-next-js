import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { checkNodeOnline } from '@/lib/daemon';

function generateKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => chars[byte % chars.length]).join('');
}

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const nodes = await prisma.node.findMany();
  type NodeRow = (typeof nodes)[number];
  const withStatus = await Promise.all(
    nodes.map(async (node: NodeRow) => {
      const instances = await prisma.server.findMany({ where: { nodeId: node.id } });
      const online = await checkNodeOnline(node.address, node.port, node.key);
      return { ...node, instances, online };
    })
  );
  return NextResponse.json({ nodes: withStatus });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, ram, cpu, disk, address, port, sftpPort } = body;

  if (!name || typeof name !== 'string' || name.length < 3 || name.length > 50) {
    return NextResponse.json({ error: 'Name must be 3–50 characters.' }, { status: 400 });
  }

  const ramVal = parseFloat(ram);
  const cpuVal = parseFloat(cpu);
  const diskVal = parseFloat(disk);
  const portVal = parseInt(port);
  const sftpPortVal = sftpPort ? parseInt(sftpPort) : 3003;

  if (isNaN(ramVal) || ramVal <= 0) return NextResponse.json({ error: 'RAM must be a positive number.' }, { status: 400 });
  if (isNaN(cpuVal) || cpuVal <= 0) return NextResponse.json({ error: 'CPU must be a positive number.' }, { status: 400 });
  if (isNaN(diskVal) || diskVal <= 0) return NextResponse.json({ error: 'Disk must be a positive number.' }, { status: 400 });
  if (!address) return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  if (isNaN(portVal) || portVal <= 1024 || portVal > 65535) {
    return NextResponse.json({ error: 'Port must be between 1025 and 65535.' }, { status: 400 });
  }

  const key = generateKey(32);
  const node = await prisma.node.create({
    data: { name, ram: ramVal, cpu: cpuVal, disk: diskVal, address, port: portVal, sftpPort: sftpPortVal, key },
  });

  return NextResponse.json({ success: true, node });
}
