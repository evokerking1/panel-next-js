import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/api/admin-auth';
import {
  buildGeneralSettings,
  buildSecuritySettings,
  buildServerPolicySettings,
  DEFAULT_PANEL_SETTINGS,
} from '@/lib/settings/panel-settings';

async function upsertSettings(data: Record<string, unknown>) {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { ...DEFAULT_PANEL_SETTINGS, ...data },
  });
}

async function getOrCreateSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } })
  if (existing) {
    return existing
  }

  return prisma.settings.create({ data: DEFAULT_PANEL_SETTINGS })
}

async function updateBannedIps(ip: string, mode: 'add' | 'remove') {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  let banned: string[] = []
  try {
    banned = JSON.parse(settings?.bannedIps || '[]')
  } catch {
    banned = []
  }

  if (mode === 'add') {
    if (!banned.includes(ip)) banned.push(ip)
  } else {
    banned = banned.filter((entry) => entry !== ip)
  }

  return { bannedIps: JSON.stringify(banned) }
}

function getSettingsSectionUpdate(section: string, body: Record<string, unknown>) {
  if (section === 'general') {
    return buildGeneralSettings(body)
  }

  if (section === 'security') {
    return buildSecuritySettings(body)
  }

  if (section === 'server-policy') {
    return buildServerPolicySettings(body)
  }

  if (section === 'ban-ip') {
    const ip = body.ip
    if (!ip || typeof ip !== 'string' || !/^[\d.:a-fA-F]+$/.test(ip)) {
      throw new Error('Invalid IP address.')
    }
    return updateBannedIps(ip, 'add')
  }

  if (section === 'unban-ip') {
    const ip = body.ip
    if (!ip || typeof ip !== 'string') {
      throw new Error('IP required.')
    }
    return updateBannedIps(ip, 'remove')
  }

  return {}
}

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getOrCreateSettings()
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await requireAdminUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const section = new URL(req.url).searchParams.get('section') || 'general';

  let data: Record<string, unknown>;
  try {
    data = await getSettingsSectionUpdate(section, body)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid settings update.' },
      { status: 400 },
    )
  }

  const updated = await upsertSettings(data);
  return NextResponse.json({ success: true, settings: updated });
}
