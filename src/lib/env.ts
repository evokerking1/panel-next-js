import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const envPath = path.resolve(process.cwd(), '.env');

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function parseEnv(content: string) {
  const values: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = stripQuotes(trimmed.slice(eqIndex + 1));
    if (key) values[key] = value;
  }

  return values;
}

function formatEnv(secret: string) {
  return [
    '# Database',
    'DATABASE_URL="file:./prisma/dev.db"',
    '',
    '# Session',
    `SESSION_SECRET="${secret}"`,
    '',
    '# Cookie security',
    '# Set to "true" only if running behind HTTPS (e.g. Nginx with SSL).',
    '# Leave as "false" for local dev and Codespaces.',
    'COOKIE_SECURE="false"',
    '',
    '# Server',
    'PORT=3000',
    'HOST="0.0.0.0"',
    'NODE_ENV="development"',
    '',
  ].join('\n');
}

export function ensureEnvLoaded() {
  let fileContent = '';
  let envValues: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    fileContent = fs.readFileSync(envPath, 'utf8');
    envValues = parseEnv(fileContent);
  }

  if (!envValues.SESSION_SECRET) {
    const secret = randomBytes(32).toString('hex');

    if (!fileContent.trim()) {
      fileContent = formatEnv(secret);
    } else {
      const needsTrailingNewline = !fileContent.endsWith('\n');
      const prefix = needsTrailingNewline ? '\n' : '';
      fileContent = `${fileContent}${prefix}\nSESSION_SECRET="${secret}"\n`;
    }

    fs.writeFileSync(envPath, fileContent, 'utf8');
    envValues = parseEnv(fileContent);
  }

  for (const [key, value] of Object.entries(envValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
