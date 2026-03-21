import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './session';
import prisma from './prisma';
import { redirect } from 'next/navigation';

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.user?.id) redirect('/login');
  return session.user;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.user?.id) redirect('/login');

  const user = await prisma.users.findUnique({ where: { id: session.user.id } });
  if (!user?.isAdmin) redirect('/');

  return user;
}

export async function requireAuthWithUser() {
  const session = await getSession();
  if (!session.user?.id) redirect('/login');

  const user = await prisma.users.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  return user;
}

export async function requireServerAccess(serverId: string) {
  const session = await getSession();
  if (!session.user?.id) redirect('/login');

  const user = await prisma.users.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  if (user.isAdmin) return { user, server: null };

  const server = await prisma.server.findUnique({
    where: { UUID: serverId },
    select: { ownerId: true },
  });

  if (!server || server.ownerId !== user.id) redirect('/');

  return { user, server };
}

// For API route handlers — returns null instead of redirecting
export async function getSessionUser() {
  const session = await getSession();
  return session.user ?? null;
}

export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { isAdmin: true, permissions: true },
  });

  if (!user) return false;
  if (user.isAdmin) return true;

  let perms: string[] = [];
  try {
    perms = JSON.parse(user.permissions || '[]');
  } catch {
    return false;
  }

  return perms.some((p) => {
    if (p === permission) return true;
    if (p.endsWith('.*')) return permission.startsWith(p.slice(0, -2) + '.');
    return false;
  });
}
