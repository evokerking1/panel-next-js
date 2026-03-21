import crypto from 'crypto';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import prisma from './prisma';

const SIGNATURE_WINDOW_S = 30;
export { SIGNATURE_WINDOW_S };

let cachedScheme: 'http' | 'https' = 'http';
let schemeCachedAt = 0;
const SCHEME_CACHE_TTL_MS = 60_000;

async function refreshSchemeCache() {
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    cachedScheme = s?.enforceDaemonHttps ? 'https' : 'http';
  } catch {
    // keep whatever we had
  }
  schemeCachedAt = Date.now();
}

export async function daemonScheme(): Promise<'http' | 'https'> {
  if (Date.now() - schemeCachedAt > SCHEME_CACHE_TTL_MS) await refreshSchemeCache();
  return cachedScheme;
}

export function daemonSchemeSync(): 'http' | 'https' {
  if (Date.now() - schemeCachedAt > SCHEME_CACHE_TTL_MS) refreshSchemeCache();
  return cachedScheme;
}

export async function daemonBaseUrl(address: string, port: number | string) {
  const scheme = await daemonScheme();
  return `${scheme}://${address}:${port}`;
}

function hmacSign(key: string, method: string, path: string, body: string, timestamp: number) {
  const payload = `${timestamp}:${method.toUpperCase()}:${path}:${body}`;
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

// Call once at startup to auto-sign all Airlink→daemon axios requests
export function installDaemonRequestInterceptor() {
  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!config.auth || (config.auth as any).username !== 'Airlink') return config;

    const key = (config.auth as any).password;
    if (!key) return config;

    const method = (config.method || 'GET').toUpperCase();

    let urlPath = '/';
    try {
      urlPath = new URL(config.url || '', 'http://localhost').pathname;
    } catch {
      urlPath = (config.url || '/').split('?')[0];
    }

    const body = config.data
      ? typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
      : '';

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = hmacSign(key, method, urlPath, body, timestamp);

    config.headers.set('X-Airlink-Timestamp', String(timestamp));
    config.headers.set('X-Airlink-Signature', signature);

    return config;
  });
}
