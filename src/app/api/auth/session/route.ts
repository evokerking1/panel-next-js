import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function GET(req: NextRequest) {
  const res = NextResponse.json({});
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  if (!session.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: session.user });
}
