import { randomBytes } from 'crypto';

declare global {
  // eslint-disable-next-line no-var
  var __airlinkSessionSecret: string | undefined;
}

const sessionSecret =
  process.env.SESSION_SECRET ||
  globalThis.__airlinkSessionSecret ||
  randomBytes(32).toString('hex');

if (!process.env.SESSION_SECRET) {
  globalThis.__airlinkSessionSecret = sessionSecret;
  process.env.SESSION_SECRET = sessionSecret;
}

export function getSessionSecret() {
  return sessionSecret;
}
