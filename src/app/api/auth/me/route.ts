import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);

  try {
    const userCount = await prisma.users.count();
    return NextResponse.json({
      user: session.user ?? null,
      userCount,
    });
  } catch {
    return NextResponse.json({
      user: session.user ?? null,
      userCount: 0,
    });
  }
}
