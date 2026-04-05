import { NextRequest, NextResponse } from 'next/server'
import { uninstallAddon } from '@/lib/addon-store'
import { requireAdminUser } from '@/lib/api/admin-auth'

export async function POST(req: NextRequest) {
  const user = await requireAdminUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { slug?: string }
  if (!body.slug) {
    return NextResponse.json({ error: 'Missing addon slug.' }, { status: 400 })
  }

  try {
    await uninstallAddon(body.slug)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Addon uninstall failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
