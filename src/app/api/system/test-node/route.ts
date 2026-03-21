import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { checkNodeStatus } from '@/lib/nodeStatus';

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const full = await prisma.users.findUnique({ where: { id: user.id } });
  if (!full?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { address, port, key } = await req.json();
  if (!address || !port || !key) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });

  const result = await checkNodeStatus({ address, port: parseInt(port, 10), key });

  if (result.status === 'Offline') {
    return NextResponse.json({ success: false, message: result.error ?? 'Failed to connect' });
  }

  return NextResponse.json({ success: true, message: `Connected — daemon v${result.versionRelease ?? 'unknown'}`, version: result.versionRelease });
}
