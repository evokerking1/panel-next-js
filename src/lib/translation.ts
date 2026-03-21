import fs from 'fs';
import path from 'path';

const cache = new Map<string, Record<string, unknown>>();

function load(lang: string): Record<string, unknown> {
  if (cache.has(lang)) return cache.get(lang)!;

  const langPath = path.join(process.cwd(), 'storage', 'lang', lang, 'lang.json');
  const fallback = path.join(process.cwd(), 'storage', 'lang', 'en', 'lang.json');

  try {
    const file = fs.existsSync(langPath) ? langPath : fallback;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache.set(lang, data);
    return data;
  } catch {
    try {
      const data = JSON.parse(fs.readFileSync(fallback, 'utf8'));
      cache.set(lang, data);
      return data;
    } catch {
      return {};
    }
  }
}

export function getTranslations(lang: string = 'en'): Record<string, string> {
  return load(lang) as Record<string, string>;
}
