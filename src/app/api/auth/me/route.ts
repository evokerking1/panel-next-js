import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();

  try {
    const userCount = await prisma.users.count();

    // Re-fetch avatar fresh from DB so it reflects recent uploads
    if (session.user) {
      const fresh = await prisma.users.findUnique({
        where: { id: session.user.id },
        select: { avatar: true },
      }).catch(() => null);

      const userWithAvatar = { ...session.user, avatar: fresh?.avatar ?? null };
      return NextResponse.json({ user: userWithAvatar, userCount });
    }

    return NextResponse.json({ user: null, userCount });
  } catch {
    return NextResponse.json({ user: session.user ?? null, userCount: 0 });
  }
}
