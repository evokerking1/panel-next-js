import { getSessionSecret } from './session-secret';

export const sessionOptions = {
  password: getSessionSecret(),
  cookieName: 'airlink_session',
  cookieOptions: {
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 72,
  },
};
