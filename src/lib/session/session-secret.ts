import { ensureEnvLoaded } from '../env';

ensureEnvLoaded();

const sessionSecret = process.env.SESSION_SECRET;

export function getSessionSecret() {
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET could not be loaded or generated.');
  }
  return sessionSecret;
}
