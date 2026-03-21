import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 1) return NextResponse.json({ results: [] });

  const fullUser = await prisma.users.findUnique({ where: { id: user.id } });
  if (!fullUser) return NextResponse.json({ results: [] }, { status: 401 });

  const results: { type: string; label: string; sub: string; url: string }[] = [];

  const serverWhere = fullUser.isAdmin
    ? { OR: [{ name: { contains: q } }, { UUID: { contains: q } }] }
    : { ownerId: user.id, OR: [{ name: { contains: q } }, { UUID: { contains: q } }] };

  const servers = await prisma.server.findMany({
    where: serverWhere as any,
    select: { UUID: true, name: true, description: true },
    take: 8,
  });

  servers.forEach((s) =>
    results.push({ type: 'server', label: s.name, sub: s.description || s.UUID, url: `/server/${s.UUID}` }),
  );

  if (fullUser.isAdmin) {
    const users = await prisma.users.findMany({
      where: { OR: [{ username: { contains: q } }, { email: { contains: q } }] },
      select: { id: true, username: true, email: true },
      take: 5,
    });
    users.forEach((u) =>
      results.push({ type: 'user', label: u.username ?? u.email, sub: u.email, url: `/admin/users/view/${u.id}` }),
    );

    const nodes = await prisma.node.findMany({
      where: { OR: [{ name: { contains: q } }, { address: { contains: q } }] },
      select: { id: true, name: true, address: true },
      take: 4,
    });
    nodes.forEach((n) =>
      results.push({ type: 'node', label: n.name, sub: n.address, url: `/admin/nodes/${n.id}/stats` }),
    );
  }

  return NextResponse.json({ results });
}
