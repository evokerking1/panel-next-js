import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const server = await prisma.server.findUnique({ where: { UUID: id } });
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser?.isAdmin && server.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: any = {};

  if (body.variables !== undefined) data.Variables = JSON.stringify(body.variables);
  if (body.startCommand !== undefined && (server.allowStartupEdit || fullUser?.isAdmin)) {
    data.StartCommand = body.startCommand;
  }

  await prisma.server.update({ where: { UUID: id }, data });
  return NextResponse.json({ success: true });
}
