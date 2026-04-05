import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'

export async function requireAdminUser(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user?.isAdmin) {
    return null
  }
  return session.user
}
