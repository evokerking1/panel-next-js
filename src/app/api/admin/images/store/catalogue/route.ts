import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

const EGGS_DIR = path.resolve(process.cwd(), 'storage', 'eggs');
const CACHE_FILE = path.join(EGGS_DIR, 'catalogue.json');
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

interface EggEntry {
  name: string;
  description: string;
  author: string;
  category: string;
  group: string;
  egg: Record<string, unknown>;
}

function isGitAvailable() {
  try { execSync('git --version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function buildCatalogueFromDisk(): EggEntry[] {
  const images: EggEntry[] = [];
  const categories = ['game', 'application', 'generic'];

  for (const cat of categories) {
    const catDir = path.join(EGGS_DIR, `${cat}-eggs`);
    if (!fs.existsSync(catDir)) continue;

    const groups = fs.readdirSync(catDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const group of groups) {
      const groupDir = path.join(catDir, group);
      const jsonFiles = fs.readdirSync(groupDir).filter(f => f.endsWith('.json') && !f.includes('README'));

      for (const file of jsonFiles) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(groupDir, file), 'utf-8'));
          images.push({
            name: raw.name || group,
            description: raw.description || '',
            author: raw.author || '',
            category: cat,
            group,
            egg: raw,
          });
        } catch {}
      }
    }
  }

  return images;
}

function loadCachedCatalogue() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      return cached;
    }
  } catch {}
  return null;
}

function saveCatalogueCache(images: EggEntry[]) {
  try {
    fs.mkdirSync(EGGS_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ images, builtAt: Date.now() }));
  } catch {}
}

async function ensureCatalogue() {
  const cached = loadCachedCatalogue();
  if (cached && cached.builtAt && (Date.now() - cached.builtAt) < TWO_DAYS_MS) {
    return cached;
  }

  if (!isGitAvailable()) {
    if (cached) return cached;
    return { images: [], builtAt: Date.now() };
  }

  const repos = [
    { id: 'game', dir: 'game-eggs', url: 'https://github.com/pterodactyl/game-eggs.git' },
    { id: 'application', dir: 'application-eggs', url: 'https://github.com/pterodactyl/application-eggs.git' },
    { id: 'generic', dir: 'generic-eggs', url: 'https://github.com/pterodactyl/generic-eggs.git' },
  ];

  fs.mkdirSync(EGGS_DIR, { recursive: true });

  for (const repo of repos) {
    const targetDir = path.join(EGGS_DIR, repo.dir);
    try {
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        execSync('git pull --quiet', { cwd: targetDir, timeout: 30000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
      } else {
        execSync(`git clone --depth=1 --quiet "${repo.url}" "${targetDir}"`, {
          timeout: 60000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        });
      }
    } catch {}
  }

  const images = buildCatalogueFromDisk();
  const result = { images, builtAt: Date.now() };
  saveCatalogueCache(images);
  return result;
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await ensureCatalogue();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load catalogue.' }, { status: 500 });
  }
}
