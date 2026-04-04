import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session/index'
import { fetchAddonStoreListWithInstalled } from '@/lib/addon-store'

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user?.isAdmin) return null
  return session.user
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const addons = await fetchAddonStoreListWithInstalled()
    return NextResponse.json({ success: true, addons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch addon store'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
