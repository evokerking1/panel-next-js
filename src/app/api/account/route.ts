import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import validator from 'validator';

export async function PATCH(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { username, email, description } = body;

  if (email && !validator.isEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  if (username && !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
    return NextResponse.json({ error: 'Username must be 3–20 alphanumeric characters.' }, { status: 400 });
  }

  const data: any = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (description !== undefined) data.description = description;

  const updated = await prisma.users.update({ where: { id: user.id }, data });

  return NextResponse.json({ success: true, user: { id: updated.id, username: updated.username } });
}
