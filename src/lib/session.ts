import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  description: string;
}

export interface SessionData {
  user?: SessionUser;
}

const sessionOptions = {
  password: (() => {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      console.warn('[session] SESSION_SECRET is not set. Using insecure default — set this in production.');
    }
    return secret || 'change-this-secret-to-something-32-chars-long';
  })(),
  cookieName: 'airlink_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 72,
  },
};

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

export async function requireAuth(adminOnly = false): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session.user) return null;
  if (adminOnly && !session.user.isAdmin) return null;
  return session.user;
}
