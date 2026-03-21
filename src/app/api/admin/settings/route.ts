import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

async function requireAdmin(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return null;
  const full = await prisma.users.findUnique({ where: { id: user.id } });
  return full?.isAdmin ? full : null;
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const allowed = [
    'title','description','logo','language','allowRegistration','uploadLimit',
    'rateLimitEnabled','rateLimitRpm','allowUserCreateServer','allowUserDeleteServer',
    'defaultServerLimit','defaultMaxMemory','defaultMaxCpu','defaultMaxStorage',
    'loginMaxAttempts','loginLockoutMinutes','enforceDaemonHttps',
    'behindReverseProxy','hashApiKeys',
  ];

  const data: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json({ success: true });
}
