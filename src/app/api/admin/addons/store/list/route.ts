import { NextRequest, NextResponse } from 'next/server'
import { fetchAddonStoreListWithInstalled } from '@/lib/addon-store'
import { requireAdminUser } from '@/lib/api/admin-auth'

export async function GET(req: NextRequest) {
  const user = await requireAdminUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const addons = await fetchAddonStoreListWithInstalled()
    return NextResponse.json({ success: true, addons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch addon store'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
