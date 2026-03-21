import { NextRequest, NextResponse } from 'next/server';
import { getApiUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  const user = await getApiUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required.' }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  const full = await prisma.users.findUnique({ where: { id: user.id } });
  if (!full) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, full.password);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });

  await prisma.users.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 12) },
  });

  return NextResponse.json({ success: true });
}
