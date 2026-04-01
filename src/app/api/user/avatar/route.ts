import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, unlink, rmdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSessionFromRequest } from '@/lib/session';
import prisma from '@/lib/prisma';

async function getSessionUser(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  return session.user ?? null;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });

  const file = formData.get('avatar') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, GIF, or WebP images allowed.' }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 2 MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const userDir = path.join(process.cwd(), 'public', 'uploads', 'avatars', sessionUser.username);

  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  } else {
    const existing = await readdir(userDir).catch(() => []);
    for (const f of existing) {
      await unlink(path.join(userDir, f)).catch(() => {});
    }
  }

  const filename = `avatar.${ext}`;
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(userDir, filename), Buffer.from(bytes));

  const avatarPath = `/uploads/avatars/${sessionUser.username}/${filename}`;
  await prisma.users.update({ where: { id: sessionUser.id }, data: { avatar: avatarPath } });

  return NextResponse.json({ avatar: avatarPath });
}

export async function DELETE(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userDir = path.join(process.cwd(), 'public', 'uploads', 'avatars', sessionUser.username);
  if (existsSync(userDir)) {
    const files = await readdir(userDir).catch(() => []);
    for (const f of files) {
      await unlink(path.join(userDir, f)).catch(() => {});
    }
    await rmdir(userDir).catch(() => {});
  }

  await prisma.users.update({ where: { id: sessionUser.id }, data: { avatar: null } });
  return NextResponse.json({ success: true });
}
