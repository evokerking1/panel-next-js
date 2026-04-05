import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/api/admin-auth'
import { refreshEggCatalogueInBackground } from '@/lib/images/egg-store'

export async function POST(req: NextRequest) {
  const user = await requireAdminUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  refreshEggCatalogueInBackground()
  return NextResponse.json({ message: 'Refresh started. The catalogue will update in the background.' })
}
