import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const email = (body.get('email') as string) || '';
  const username = (body.get('username') as string) || '';
  const password = (body.get('password') as string) || '';

  const fail = (err: string) =>
    NextResponse.redirect(new URL(`/register?err=${err}`, req.url), 303);

  if (!email || !username || !password) return fail('missing_credentials');
  if (!emailRegex.test(email) || !passwordRegex.test(password)) return fail('invalid_input');
  if (!usernameRegex.test(username)) return fail('invalid_username');

  try {
    const userCount = await prisma.users.count();
    const isFirst = userCount === 0;

    if (!isFirst) {
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      if (!settings?.allowRegistration) {
        return NextResponse.redirect(new URL('/login?err=registration_disabled', req.url), 303);
      }
    }

    const existing = await prisma.users.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) return fail('user_already_exists');

    const user = await prisma.users.create({
      data: {
        email,
        username,
        password: await bcrypt.hash(password, 12),
        description: 'No About Me',
        isAdmin: isFirst,
      },
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

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return fail('missing_credentials');
  }
}
