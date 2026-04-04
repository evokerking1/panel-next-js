import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import prisma from '@/lib/prisma'

const ADDONS_REPO_OWNER = 'airlinklabs'
const ADDONS_REPO_NAME = 'addons'
const GITHUB_API_BASE = `https://api.github.com/repos/${ADDONS_REPO_OWNER}/${ADDONS_REPO_NAME}`
const ADDONS_RAW_BASE = `https://raw.githubusercontent.com/${ADDONS_REPO_OWNER}/${ADDONS_REPO_NAME}/main`

export const ADDONS_DIR = path.resolve(process.cwd(), 'storage', 'addons')

interface InstallManifest {
  repo?: string
  branch?: string
  note?: string
}

export interface AddonStoreEntry {
  id: string
  name: string
  version: string
  description: string
  longDescription: string
  author: string
  status: string
  tags: string[]
  icon: string
  features: string[]
  github: string
  screenshots: string[]
  installRepo: string
  installBranch: string
  installNote: string
  installed?: boolean
}

function requestHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'airlink-panel',
  }
}

function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-_]*$/i.test(slug)
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: requestHeaders(), cache: 'no-store' })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export async function fetchAddonStoreList(): Promise<AddonStoreEntry[]> {
  const contents = await fetchJson<Array<{ name: string; type: string }>>(`${GITHUB_API_BASE}/contents`)
  if (!contents) {
    throw new Error('Failed to fetch addon list from GitHub')
  }

  const folders = contents.filter((item) => item.type === 'dir' && !item.name.startsWith('.'))

  const addons = await Promise.all(
    folders.map(async (folder) => {
      const info = await fetchJson<Record<string, unknown>>(`${ADDONS_RAW_BASE}/${folder.name}/info.json`)
      if (!info) return null

      const installManifest = await fetchJson<InstallManifest>(`${ADDONS_RAW_BASE}/${folder.name}/install.json`) || {}

      return {
        id: folder.name,
        name: String(info.name || folder.name),
        version: String(info.version || ''),
        description: String(info.description || ''),
        longDescription: String(info.longDescription || info.description || ''),
        author: String(info.author || ''),
        status: String(info.status || 'working'),
        tags: Array.isArray(info.tags) ? info.tags.map(String) : [],
        icon: String(info.icon || ''),
        features: Array.isArray(info.features) ? info.features.map(String) : [],
        github: String(info.github || `https://github.com/${ADDONS_REPO_OWNER}/${ADDONS_REPO_NAME}/tree/main/${folder.name}`),
        screenshots: Array.isArray(info.screenshots) ? info.screenshots.map(String) : [],
        installRepo: String(installManifest.repo || ''),
        installBranch: String(installManifest.branch || 'main'),
        installNote: String(installManifest.note || ''),
      } satisfies AddonStoreEntry
    }),
  )

  return addons.filter((addon): addon is AddonStoreEntry => addon !== null)
}

export async function fetchAddonStoreListWithInstalled() {
  const [addons, installed] = await Promise.all([
    fetchAddonStoreList(),
    prisma.addon.findMany({ select: { slug: true } }),
  ])

  const installedSet = new Set(installed.map((addon) => addon.slug))
  return addons.map((addon) => ({
    ...addon,
    installed: installedSet.has(addon.id),
  }))
}

export async function installAddonFromStore(slug: string) {
  if (!isValidSlug(slug)) {
    throw new Error('Invalid addon slug')
  }

  const finalDir = path.join(ADDONS_DIR, slug)
  if (!finalDir.startsWith(`${ADDONS_DIR}${path.sep}`)) {
    throw new Error('Invalid addon slug')
  }

  if (fs.existsSync(finalDir)) {
    throw new Error('Addon already installed')
  }

  const manifest = await fetchJson<InstallManifest>(`${ADDONS_RAW_BASE}/${slug}/install.json`)
  if (!manifest?.repo) {
    throw new Error('Could not fetch install manifest for this addon')
  }

  const repoUrl = manifest.repo
  const branch = manifest.branch || 'main'

  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/i.test(repoUrl)) {
    throw new Error('Install manifest contains an invalid repository URL')
  }

  fs.mkdirSync(ADDONS_DIR, { recursive: true })

  const tempId = crypto.randomBytes(4).toString('hex')
  const tempDir = path.join(ADDONS_DIR, `${slug}-${tempId}`)

  try {
    execFileSync('git', ['clone', '--depth=1', '-b', branch, repoUrl, tempDir], {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      stdio: 'pipe',
    })

    const gitDir = path.join(tempDir, '.git')
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true })
    }

    const pkgPath = path.join(tempDir, 'package.json')
    let pkg: Record<string, unknown> = {}
    if (fs.existsSync(pkgPath)) {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>
    }

    fs.renameSync(tempDir, finalDir)

    const name = String(pkg.name || slug)
    const version = String(pkg.version || '1.0.0')
    const description = typeof pkg.description === 'string' ? pkg.description : null
    const author = typeof pkg.author === 'string' ? pkg.author : null
    const mainFile = typeof pkg.main === 'string' ? pkg.main : 'index.ts'

    const addon = await prisma.addon.upsert({
      where: { slug },
      update: { name, version, description, author, mainFile, enabled: true },
      create: { slug, name, version, description, author, mainFile, enabled: true },
    })

    return addon
  } catch (error) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    const message = error instanceof Error ? error.message : 'Addon installation failed'
    throw new Error(message)
  }
}

export async function uninstallAddon(slug: string) {
  if (!isValidSlug(slug)) {
    throw new Error('Invalid addon slug')
  }

  const targetDir = path.join(ADDONS_DIR, slug)
  if (!targetDir.startsWith(`${ADDONS_DIR}${path.sep}`)) {
    throw new Error('Invalid addon slug')
  }

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true })
  }

  await prisma.addon.deleteMany({ where: { slug } })
}
