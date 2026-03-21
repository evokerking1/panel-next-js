import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { checkNodeStatus } from '@/lib/nodeStatus';

async function requireAdmin(req: NextRequest) {
  const u = await getApiUser(req);
  if (!u) return null;
  const full = await prisma.users.findUnique({ where: { id: u.id } });
  return full?.isAdmin ? full : null;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const nodes = await prisma.node.findMany({ orderBy: { id: 'asc' } });
  const withStatus = await Promise.all(nodes.map(checkNodeStatus));
  return NextResponse.json(withStatus);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, address, port, key, ram, cpu, disk } = body;

  if (!name || !address || !port || !key) {
    return NextResponse.json({ error: 'name, address, port, and key are required.' }, { status: 400 });
  }

  const node = await prisma.node.create({
    data: {
      name,
      address,
      port: parseInt(port, 10),
      key,
      ram: parseInt(ram, 10) || 1024,
      cpu: parseInt(cpu, 10) || 100,
      disk: parseInt(disk, 10) || 20,
    },
  });

  return NextResponse.json({ success: true, node });
}
