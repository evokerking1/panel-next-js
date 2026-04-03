import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user?.isAdmin) return null
  return session.user
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const image = await prisma.images.findUnique({ where: { id: parseInt(id) } })
  if (!image) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  // Build a clean Pterodactyl-compatible export shape
  let dockerImages: Record<string, string> = {}
  try {
    const parsed = JSON.parse(image.dockerImages || '[]')
    if (Array.isArray(parsed)) {
      parsed.forEach((entry: Record<string, string>) => {
        const [k, v] = Object.entries(entry)[0] || []
        if (k && v) dockerImages[k] = v
      })
    }
  } catch {}

  let variables: unknown[] = []
  try { variables = JSON.parse(image.variables || '[]') } catch {}

  let scripts: unknown = {}
  try { scripts = JSON.parse(image.scripts || '{}') } catch {}

  let meta: unknown = {}
  try { meta = JSON.parse(image.meta || '{}') } catch {}

  const exportData = {
    meta: { version: 'PTDL_v2', ...(meta as object) },
    name: image.name,
    description: image.description,
    author: image.author,
    startup: image.startup,
    config: {
      stop: image.stop,
      startup: { done: image.startup_done },
      files: {},
      logs: {},
    },
    docker_images: dockerImages,
    variables,
    scripts,
  }

  const filename = `${(image.name || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
