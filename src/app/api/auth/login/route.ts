import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

async function getSecuritySettings() {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    return { maxAttempts: s?.loginMaxAttempts ?? 5, lockoutMinutes: s?.loginLockoutMinutes ?? 15 };
  } catch {
    return { maxAttempts: 5, lockoutMinutes: 15 };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const identifier = (body.get('identifier') as string) || '';
  const password = (body.get('password') as string) || '';

  const fail = (err: string, extra = '') =>
    NextResponse.redirect(new URL(`/login?err=${err}${extra}`, req.url), 303);

  if (!identifier || !password) return fail('invalid_credentials');

  try {
    const { maxAttempts, lockoutMinutes } = await getSecuritySettings();

    const user = await prisma.users.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
    });

    const hash = user?.password ?? '$2b$10$' + 'x'.repeat(53);
    const valid = await bcrypt.compare(password, hash);

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return fail('account_locked', `&wait=${mins}`);
    }

    if (!user || !valid) {
      if (user) {
        const attempts = (user.loginAttempts ?? 0) + 1;
        await prisma.users.update({
          where: { id: user.id },
          data: {
            loginAttempts: attempts,
            lockedUntil:
              attempts >= maxAttempts
                ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
                : null,
          },
        });
      }
      return fail('invalid_credentials');
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null },
    });

    const response = NextResponse.redirect(new URL('/dashboard', req.url), 303);
    const session = await getIronSession<SessionData>(req, response, sessionOptions);
    session.user = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      username: user.username ?? '',
      description: user.description ?? '',
    };
    await session.save();

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
      },
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return fail('invalid_credentials');
  }
}
