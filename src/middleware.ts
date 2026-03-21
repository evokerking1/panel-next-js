import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './lib/session';

const publicPaths = ['/login', '/register', '/api/auth'];
const adminPaths = ['/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/ws/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|css|js|svg|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  const user = session.user;

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const isAdmin = adminPaths.some((p) => pathname.startsWith(p));
  if (isAdmin && user && !user.isAdmin) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
