import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';

async function handleLogout(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url), 303);
  const session = await getIronSession<SessionData>(req, response, sessionOptions);
  session.destroy();
  return response;
}

export { handleLogout as GET, handleLogout as POST };
