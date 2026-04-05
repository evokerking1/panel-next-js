import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const EGGS_DIR = path.resolve(process.cwd(), 'storage', 'eggs')
const CACHE_FILE = path.join(EGGS_DIR, 'catalogue.json')
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
const REPOS = [
  { dir: 'game-eggs', url: 'https://github.com/pterodactyl/game-eggs.git' },
  { dir: 'application-eggs', url: 'https://github.com/pterodactyl/application-eggs.git' },
  { dir: 'generic-eggs', url: 'https://github.com/pterodactyl/generic-eggs.git' },
]

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

interface EggCatalogueCache {
  images: EggEntry[]
  builtAt: number
}

function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function readReadme(dir: string): string {
  for (const name of ['README.md', 'readme.md', 'README.MD']) {
    const filePath = path.join(dir, name)
    if (fs.existsSync(filePath)) {
      try {
        return fs.readFileSync(filePath, 'utf-8')
      } catch {}
    }
  }
  return ''
}

function readJsonFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function createEggEntry(
  raw: Record<string, unknown>,
  category: string,
  group: string,
  subGroup: string,
  groupReadme: string,
  readme: string,
): EggEntry {
  return {
    name: String(raw.name || subGroup),
    description: String(raw.description || ''),
    author: String(raw.author || ''),
    category,
    group,
    subGroup,
    readme,
    groupReadme,
    fullReadme: readme,
    egg: raw,
  }
}

function jsonFilesInDirectory(directory: string) {
  return fs.readdirSync(directory).filter((file) => file.endsWith('.json') && !file.toLowerCase().includes('readme'))
}

function collectEggEntries(
  files: string[],
  directory: string,
  category: string,
  group: string,
  subGroup: string,
  groupReadme: string,
  readme: string,
) {
  const entries: EggEntry[] = []

  for (const file of files) {
    const raw = readJsonFile(path.join(directory, file))
    if (!raw) {
      continue
    }

    entries.push(createEggEntry(raw, category, group, subGroup, groupReadme, readme))
  }

  return entries
}

function buildCatalogueFromGroup(category: string, group: string) {
  const groupDir = path.join(EGGS_DIR, `${category}-eggs`, group)
  const groupReadme = readReadme(groupDir)
  const entries = collectEggEntries(
    jsonFilesInDirectory(groupDir),
    groupDir,
    category,
    group,
    group,
    groupReadme,
    groupReadme,
  )

  const subDirectories = fs.readdirSync(groupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const subDirectory of subDirectories) {
    const directory = path.join(groupDir, subDirectory)
    const readme = readReadme(directory) || groupReadme
    entries.push(
      ...collectEggEntries(
        jsonFilesInDirectory(directory),
        directory,
        category,
        group,
        `${group}/${subDirectory}`,
        groupReadme,
        readme,
      ),
    )
  }

  return entries
}

function buildCatalogueFromDisk() {
  const images: EggEntry[] = []

  for (const category of ['game', 'application', 'generic']) {
    const categoryDir = path.join(EGGS_DIR, `${category}-eggs`)
    if (!fs.existsSync(categoryDir)) {
      continue
    }

    const groups = fs.readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    for (const group of groups) {
      images.push(...buildCatalogueFromGroup(category, group))
    }
  }

  return images
}

function loadCachedCatalogue() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as EggCatalogueCache
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

function syncEggRepositories() {
  fs.mkdirSync(EGGS_DIR, { recursive: true })

  for (const repo of REPOS) {
    const targetDir = path.join(EGGS_DIR, repo.dir)
    try {
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        execSync('git pull --quiet', {
          cwd: targetDir,
          timeout: 30000,
          stdio: 'ignore',
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        })
      } else {
        execSync(`git clone --depth=1 --quiet "${repo.url}" "${targetDir}"`, {
          timeout: 60000,
          stdio: 'ignore',
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        })
      }
    } catch {}
  }
}

function refreshEggCatalogueCache() {
  syncEggRepositories()
  const images = buildCatalogueFromDisk()
  const result = { images, builtAt: Date.now() }
  saveCatalogueCache(images)
  return result
}

export function refreshEggCatalogueInBackground() {
  setImmediate(() => {
    try {
      refreshEggCatalogueCache()
    } catch {}
  })
}

export async function ensureEggCatalogue() {
  const cached = loadCachedCatalogue()
  if (cached?.builtAt && (Date.now() - cached.builtAt) < TWO_DAYS_MS) {
    return cached
  }

  if (!isGitAvailable()) {
    return cached ?? { images: [], builtAt: Date.now() }
  }

  return refreshEggCatalogueCache()
}
