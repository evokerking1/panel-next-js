import type { SessionOptions } from 'iron-session';

export interface SessionData {
  user?: {
    id: number;
    email: string;
    username: string;
    isAdmin: boolean;
    description: string;
  };
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'change-me-to-a-long-random-secret-32-chars',
  cookieName: 'airlink_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production' || process.env.URL?.startsWith('https://'),
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 72, // 3 days in seconds
  },
};
