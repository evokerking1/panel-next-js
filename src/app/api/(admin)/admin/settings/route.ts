import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session/index';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

async function upsertSettings(data: Record<string, unknown>) {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: {
      title: 'Airlink',
      logo: '/assets/logo.png',
      favicon: '/assets/favicon.ico',
      lightTheme: 'default',
      darkTheme: 'default',
      language: 'en',
      allowRegistration: false,
      uploadLimit: 100,
      rateLimitEnabled: true,
      rateLimitRpm: 100,
      bannedIps: '[]',
      allowUserCreateServer: false,
      allowUserDeleteServer: false,
      defaultServerLimit: 0,
      defaultMaxMemory: 512,
      defaultMaxCpu: 100,
      defaultMaxStorage: 5,
      loginMaxAttempts: 5,
      loginLockoutMinutes: 15,
      enforceDaemonHttps: false,
      behindReverseProxy: false,
      hashApiKeys: false,
      ...data,
    },
  });
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        title: 'Airlink',
        logo: '/assets/logo.png',
        favicon: '/assets/favicon.ico',
        lightTheme: 'default',
        darkTheme: 'default',
        language: 'en',
        allowRegistration: false,
        uploadLimit: 100,
        rateLimitEnabled: true,
        rateLimitRpm: 100,
        bannedIps: '[]',
        allowUserCreateServer: false,
        allowUserDeleteServer: false,
        defaultServerLimit: 0,
        defaultMaxMemory: 512,
        defaultMaxCpu: 100,
        defaultMaxStorage: 5,
        loginMaxAttempts: 5,
        loginLockoutMinutes: 15,
        enforceDaemonHttps: false,
        behindReverseProxy: false,
        hashApiKeys: false,
      },
    });
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const section = new URL(req.url).searchParams.get('section') || 'general';

  let data: Record<string, unknown> = {};

  if (section === 'general') {
    data = {
      title: body.title || 'Airlink',
      description: body.description || '',
      allowRegistration: body.allowRegistration === true || body.allowRegistration === 'true',
      uploadLimit: parseInt(body.uploadLimit) || 100,
      loginWallpaper: typeof body.loginWallpaper === 'string' ? body.loginWallpaper.trim() || null : null,
      registerWallpaper: typeof body.registerWallpaper === 'string' ? body.registerWallpaper.trim() || null : null,
      lightTheme: typeof body.lightTheme === 'string' ? body.lightTheme : 'default',
      darkTheme: typeof body.darkTheme === 'string' ? body.darkTheme : 'default',
    };
    if (typeof body.virusTotalApiKey === 'string') {
      data.virusTotalApiKey = body.virusTotalApiKey.trim() || null;
    }
  } else if (section === 'security') {
    const rateLimitRpm = parseInt(body.rateLimitRpm);
    const loginMaxAttempts = parseInt(body.loginMaxAttempts);
    const loginLockoutMinutes = parseInt(body.loginLockoutMinutes);

    if (isNaN(rateLimitRpm) || rateLimitRpm < 1 || rateLimitRpm > 10000) {
      return NextResponse.json({ error: 'RPM must be between 1 and 10000.' }, { status: 400 });
    }
    if (isNaN(loginMaxAttempts) || loginMaxAttempts < 1 || loginMaxAttempts > 100) {
      return NextResponse.json({ error: 'Max attempts must be between 1 and 100.' }, { status: 400 });
    }
    if (isNaN(loginLockoutMinutes) || loginLockoutMinutes < 1 || loginLockoutMinutes > 1440) {
      return NextResponse.json({ error: 'Lockout must be between 1 and 1440 minutes.' }, { status: 400 });
    }

    data = {
      rateLimitEnabled: body.rateLimitEnabled === true || body.rateLimitEnabled === 'true',
      rateLimitRpm,
      loginMaxAttempts,
      loginLockoutMinutes,
      enforceDaemonHttps: body.enforceDaemonHttps === true || body.enforceDaemonHttps === 'true',
      behindReverseProxy: body.behindReverseProxy === true || body.behindReverseProxy === 'true',
      hashApiKeys: body.hashApiKeys === true || body.hashApiKeys === 'true',
    };
    if (typeof body.virusTotalApiKey === 'string') {
      data.virusTotalApiKey = body.virusTotalApiKey.trim() || null;
    }
  } else if (section === 'server-policy') {
    const defaultServerLimit = parseInt(body.defaultServerLimit);
    const defaultMaxMemory = parseInt(body.defaultMaxMemory);
    const defaultMaxCpu = parseInt(body.defaultMaxCpu);
    const defaultMaxStorage = parseInt(body.defaultMaxStorage);

    if (isNaN(defaultServerLimit) || defaultServerLimit < 0) return NextResponse.json({ error: 'Server limit must be 0 or greater.' }, { status: 400 });
    if (isNaN(defaultMaxMemory) || defaultMaxMemory < 128) return NextResponse.json({ error: 'Max memory must be at least 128 MB.' }, { status: 400 });
    if (isNaN(defaultMaxCpu) || defaultMaxCpu < 10) return NextResponse.json({ error: 'Max CPU must be at least 10%.' }, { status: 400 });
    if (isNaN(defaultMaxStorage) || defaultMaxStorage < 1) return NextResponse.json({ error: 'Max storage must be at least 1 GB.' }, { status: 400 });

    data = {
      allowUserCreateServer: body.allowUserCreateServer === true || body.allowUserCreateServer === 'true',
      allowUserDeleteServer: body.allowUserDeleteServer === true || body.allowUserDeleteServer === 'true',
      defaultServerLimit,
      defaultMaxMemory,
      defaultMaxCpu,
      defaultMaxStorage,
    };
  } else if (section === 'ban-ip') {
    const { ip } = body;
    if (!ip || typeof ip !== 'string' || !/^[\d.:a-fA-F]+$/.test(ip)) {
      return NextResponse.json({ error: 'Invalid IP address.' }, { status: 400 });
    }
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    let banned: string[] = [];
    try { banned = JSON.parse(settings?.bannedIps || '[]'); } catch { banned = []; }
    if (!banned.includes(ip)) banned.push(ip);
    data = { bannedIps: JSON.stringify(banned) };
  } else if (section === 'unban-ip') {
    const { ip } = body;
    if (!ip) return NextResponse.json({ error: 'IP required.' }, { status: 400 });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    let banned: string[] = [];
    try { banned = JSON.parse(settings?.bannedIps || '[]'); } catch { banned = []; }
    data = { bannedIps: JSON.stringify(banned.filter(b => b !== ip)) };
  }

  const updated = await upsertSettings(data);
  return NextResponse.json({ success: true, settings: updated });
}
