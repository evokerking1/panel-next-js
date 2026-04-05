import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'

export function daemonAuth(key: string) {
  return { username: 'Airlink', password: key }
}

export function parseSafePath(input: string): string {
  const normalized = input
    .replace(/\0/g, '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')

  if (normalized === '/') {
    return '/'
  }

  const relative = normalized.replace(/^\/+/, '')
  if (relative === '..' || relative.includes('../') || relative.startsWith('./../')) {
    throw new Error('Invalid path')
  }

  return relative
}

export async function getAccessibleServer(
  req: NextRequest,
  uuid: string,
  include: Record<string, boolean | object> = { node: true },
) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user) {
    return { error: 'Unauthorized', status: 401 } as const
  }

  const server = await (prisma.server.findUnique as any)({
    where: { UUID: uuid },
    include,
  }) as any

  if (!server) {
    return { error: 'Not found.', status: 404 } as const
  }

  if (server.ownerId !== session.user.id && !session.user.isAdmin) {
    return { error: 'Forbidden.', status: 403 } as const
  }

  return { server, user: session.user } as const
}
