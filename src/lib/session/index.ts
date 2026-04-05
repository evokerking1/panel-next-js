import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions } from './session-options';

interface SessionUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  description: string;
  avatar?: string | null;
}

interface SessionData {
  user?: SessionUser;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

async function requireAuth(adminOnly = false): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session.user) return null;
  if (adminOnly && !session.user.isAdmin) return null;
  return session.user;
}
