import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session/index';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

async function requireAdmin(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);
  if (!session.user?.isAdmin) return null;
  return session.user;
}

const EGGS_DIR = path.resolve(process.cwd(), 'storage', 'eggs');
const CACHE_FILE = path.join(EGGS_DIR, 'catalogue.json');

const repos = [
  { dir: 'game-eggs',        url: 'https://github.com/pterodactyl/game-eggs.git' },
  { dir: 'application-eggs', url: 'https://github.com/pterodactyl/application-eggs.git' },
  { dir: 'generic-eggs',     url: 'https://github.com/pterodactyl/generic-eggs.git' },
];

function buildFromDisk() {
  const images: unknown[] = [];
  const categories = [
    { id: 'game', dir: 'game-eggs' },
    { id: 'application', dir: 'application-eggs' },
    { id: 'generic', dir: 'generic-eggs' },
  ];
  for (const cat of categories) {
    const catDir = path.join(EGGS_DIR, cat.dir);
    if (!fs.existsSync(catDir)) continue;
    const groups = fs.readdirSync(catDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    for (const group of groups) {
      const groupDir = path.join(catDir, group);
      const files = fs.readdirSync(groupDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(groupDir, file), 'utf-8'));
          images.push({ name: raw.name || group, description: raw.description || '', author: raw.author || '', category: cat.id, group, egg: raw });
        } catch {}
      }
    }
  }
  return images;
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Run in background — respond immediately
  setImmediate(async () => {
    try {
      fs.mkdirSync(EGGS_DIR, { recursive: true });
      for (const repo of repos) {
        const targetDir = path.join(EGGS_DIR, repo.dir);
        try {
          if (fs.existsSync(path.join(targetDir, '.git'))) {
            execSync('git pull --quiet', { cwd: targetDir, timeout: 30000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
          } else {
            execSync(`git clone --depth=1 --quiet "${repo.url}" "${targetDir}"`, { timeout: 60000, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
          }
        } catch {}
      }
      const images = buildFromDisk();
      fs.writeFileSync(CACHE_FILE, JSON.stringify({ images, builtAt: Date.now() }));
    } catch {}
  });

  return NextResponse.json({ message: 'Refresh started. The catalogue will update in the background.' });
}
