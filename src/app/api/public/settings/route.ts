import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const defaults = {
  title: 'Airlink',
  logo: '/assets/logo.png',
  loginWallpaper: null,
  registerWallpaper: null,
  allowRegistration: false,
};

export async function GET() {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!s) return NextResponse.json(defaults);

    return NextResponse.json({
      title: s.title,
      logo: s.logo,
      loginWallpaper: s.loginWallpaper ?? null,
      registerWallpaper: s.registerWallpaper ?? null,
      allowRegistration: s.allowRegistration,
    });
  } catch {
    return NextResponse.json(defaults);
  }
}
