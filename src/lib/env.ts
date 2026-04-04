import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const envPath = path.resolve(process.cwd(), '.env');

function stripQuotes(value: string) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function stripInlineComment(value: string) {
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"' || char === "'") {
      if (quote === char) {
        quote = null;
      } else if (quote === null) {
        quote = char;
      }
      continue;
    }

    if (char === '#' && quote === null) {
      return value.slice(0, i).trim();
    }
  }

  return value.trim();
}

function parseEnv(content: string) {
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIndex = normalized.indexOf('=');
    if (eqIndex === -1) continue;

    const key = normalized.slice(0, eqIndex).trim();
    const value = stripQuotes(stripInlineComment(normalized.slice(eqIndex + 1)));
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
    'URL="http://localhost:3000"',
    'NAME="Airlink"',
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

  if (!envValues.URL) {
    const host = envValues.HOST || process.env.HOST || 'localhost';
    const port = envValues.PORT || process.env.PORT || '3000';
    const normalizedHost = host === '0.0.0.0' ? 'localhost' : host;
    envValues.URL = `http://${normalizedHost}:${port}`;
  }

  if (!envValues.NAME) {
    envValues.NAME = 'Airlink';
  }

  for (const [key, value] of Object.entries(envValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
