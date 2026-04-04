import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session/index'
import { installAddonFromStore } from '@/lib/addon-store'

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user?.isAdmin) return null
  return session.user
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { slug?: string }
  if (!body.slug) {
    return NextResponse.json({ error: 'Missing addon slug.' }, { status: 400 })
  }

  try {
    const addon = await installAddonFromStore(body.slug)
    return NextResponse.json({ success: true, addon })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Addon installation failed'
    const status = message.includes('already installed') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
