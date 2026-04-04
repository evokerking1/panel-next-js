import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';
import { uninstallAddon } from '@/lib/addon-store';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const addonId = Number.parseInt(id, 10);
  if (Number.isNaN(addonId)) {
    return NextResponse.json({ error: 'Invalid addon id.' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const addon = await prisma.addon.update({
    where: { id: addonId },
    data: { enabled: body.enabled },
  });

  return NextResponse.json({ success: true, addon });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const addonId = Number.parseInt(id, 10);
  if (Number.isNaN(addonId)) {
    return NextResponse.json({ error: 'Invalid addon id.' }, { status: 400 });
  }

  const addon = await prisma.addon.findUnique({ where: { id: addonId } });
  if (!addon) {
    return NextResponse.json({ error: 'Addon not found.' }, { status: 404 });
  }

  await uninstallAddon(addon.slug);
  return NextResponse.json({ success: true });
}
