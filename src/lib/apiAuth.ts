import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from './session';
import prisma from './prisma';
import crypto from 'crypto';

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function getApiUser(req: NextRequest) {
  // iron-session v8 needs a response object to write cookies back if needed
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  return session.user ?? null;
}

export async function validateApiKey(req: NextRequest, permission?: string) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7);

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const lookupKey = settings?.hashApiKeys ? sha256(rawKey) : rawKey;
    const key = await prisma.apiKey.findUnique({ where: { key: lookupKey } });

    if (!key || !key.active) return null;

    if (permission) {
      const perms: string[] = JSON.parse(key.permissions || '[]');
      const hasIt = perms.some((p) => {
        if (p === permission) return true;
        if (p.endsWith('.*')) return permission.startsWith(p.slice(0, -2) + '.');
        return false;
      });
      if (!hasIt) return null;
    }

    return key;
  } catch {
    return null;
  }
}
