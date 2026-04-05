import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'

export async function requireFolderOwner(req: NextRequest, folderId: number) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user) {
    return { error: 'Unauthorized', status: 401 } as const
  }

  const folder = await prisma.serverFolder.findUnique({ where: { id: folderId } })
  if (!folder) {
    return { error: 'Not found.', status: 404 } as const
  }

  if (folder.ownerId !== session.user.id) {
    return { error: 'Forbidden.', status: 403 } as const
  }

  return { folder, user: session.user } as const
}
