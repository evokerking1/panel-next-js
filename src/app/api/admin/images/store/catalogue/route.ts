import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/api/admin-auth'
import { ensureEggCatalogue } from '@/lib/images/egg-store'

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await ensureEggCatalogue()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ error: 'Failed to load catalogue.' }, { status: 500 })
  }
}
