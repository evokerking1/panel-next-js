import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import axios from 'axios';
import { daemonSchemeSync } from '@/lib/daemon';

async function getServerAndVerify(req: NextRequest, id: string) {
  const user = await getApiUser(req);
  if (!user) return null;

  const server = await prisma.server.findUnique({
    where: { UUID: id },
    include: { node: true },
  });
  if (!server) return null;

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) return null;

  return { server, user: fullUser };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getServerAndVerify(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { server } = result;
  const { node } = server;
  const path = req.nextUrl.searchParams.get('path') || '/';
  const scheme = daemonSchemeSync();

  try {
    const res = await axios({
      method: 'GET',
      url: `${scheme}://${node.address}:${node.port}/fs/list`,
      auth: { username: 'Airlink', password: node.key },
      params: { id, path },
      timeout: 10000,
    });
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getServerAndVerify(req, id);
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { server } = result;
  const { node } = server;
  const body = await req.json();
  const scheme = daemonSchemeSync();
  const action = body.action as string;

  const actionMap: Record<string, string> = {
    create: '/fs/folder/create',
    delete: '/fs/delete',
    rename: '/fs/rename',
    move: '/fs/move',
    compress: '/fs/compress',
    decompress: '/fs/decompress',
  };

  const endpoint = actionMap[action];
  if (!endpoint) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  try {
    const res = await axios({
      method: 'POST',
      url: `${scheme}://${node.address}:${node.port}${endpoint}`,
      auth: { username: 'Airlink', password: node.key },
      data: { id, ...body },
      timeout: 30000,
    });
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
