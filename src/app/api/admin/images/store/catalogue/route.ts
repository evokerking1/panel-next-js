import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next()
  const session = await getSessionFromRequest(req, res)
  if (!session.user?.isAdmin) return null
  return session.user
}

const EGGS_DIR = path.resolve(process.cwd(), 'storage', 'eggs')
const CACHE_FILE = path.join(EGGS_DIR, 'catalogue.json')
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

interface EggEntry {
  name: string
  description: string
  author: string
  category: string
  group: string
  subGroup: string
  readme: string
  groupReadme: string
  fullReadme: string
  egg: Record<string, unknown>
}

function isGitAvailable() {
  try { execSync('git --version', { stdio: 'ignore' }); return true } catch { return false }
}

function readReadme(dir: string): string {
  for (const name of ['README.md', 'readme.md', 'README.MD']) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) {
      try { return fs.readFileSync(p, 'utf-8') } catch {}
    }
  }
  return ''
}

function buildCatalogueFromDisk(): EggEntry[] {
  const images: EggEntry[] = []
  const categories = ['game', 'application', 'generic']

  for (const cat of categories) {
    const catDir = path.join(EGGS_DIR, `${cat}-eggs`)
    if (!fs.existsSync(catDir)) continue

    const groups = fs.readdirSync(catDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const group of groups) {
      const groupDir = path.join(catDir, group)
      const groupReadme = readReadme(groupDir)

      // Some groups have a flat list of eggs, others have sub-folders
      const jsonFiles = fs.readdirSync(groupDir)
        .filter(f => f.endsWith('.json') && !f.toLowerCase().includes('readme'))

      for (const file of jsonFiles) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(groupDir, file), 'utf-8'))
          images.push({
            name: raw.name || group,
            description: raw.description || '',
            author: raw.author || '',
            category: cat,
            group,
            subGroup: group,
            readme: groupReadme,
            groupReadme,
            fullReadme: groupReadme,
            egg: raw,
          })
        } catch {}
      }

      // Also check one level of sub-folders (e.g. game-eggs/minecraft/java/egg-*.json)
      const subDirs = fs.readdirSync(groupDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)

      for (const sub of subDirs) {
        const subDir = path.join(groupDir, sub)
        const subReadme = readReadme(subDir) || groupReadme
        const subJsonFiles = fs.readdirSync(subDir)
          .filter(f => f.endsWith('.json') && !f.toLowerCase().includes('readme'))

        for (const file of subJsonFiles) {
          try {
            const raw = JSON.parse(fs.readFileSync(path.join(subDir, file), 'utf-8'))
            images.push({
              name: raw.name || sub,
              description: raw.description || '',
              author: raw.author || '',
              category: cat,
              group,
              subGroup: `${group}/${sub}`,
              readme: subReadme,
              groupReadme,
              fullReadme: subReadme,
              egg: raw,
            })
          } catch {}
        }
      }
    }
  }

  return images
}

function loadCachedCatalogue() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    }
  } catch {}
  return null
}

function saveCatalogueCache(images: EggEntry[]) {
  try {
    fs.mkdirSync(EGGS_DIR, { recursive: true })
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ images, builtAt: Date.now() }))
  } catch {}
}

async function ensureCatalogue() {
  const cached = loadCachedCatalogue()
  if (cached?.builtAt && (Date.now() - cached.builtAt) < TWO_DAYS_MS) {
    return cached
  }

  if (!isGitAvailable()) {
    if (cached) return cached
    return { images: [], builtAt: Date.now() }
  }

  const repos = [
    { dir: 'game-eggs', url: 'https://github.com/pterodactyl/game-eggs.git' },
    { dir: 'application-eggs', url: 'https://github.com/pterodactyl/application-eggs.git' },
    { dir: 'generic-eggs', url: 'https://github.com/pterodactyl/generic-eggs.git' },
  ]

  fs.mkdirSync(EGGS_DIR, { recursive: true })

  for (const repo of repos) {
    const targetDir = path.join(EGGS_DIR, repo.dir)
    try {
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        execSync('git pull --quiet', { cwd: targetDir, timeout: 30000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
      } else {
        execSync(`git clone --depth=1 --quiet "${repo.url}" "${targetDir}"`, {
          timeout: 60000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        })
      }
    } catch {}
  }

  const images = buildCatalogueFromDisk()
  const result = { images, builtAt: Date.now() }
  saveCatalogueCache(images)
  return result
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await ensureCatalogue()
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch {
    return NextResponse.json({ error: 'Failed to load catalogue.' }, { status: 500 })
  }
}
