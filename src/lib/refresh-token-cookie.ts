import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config.js';
import { REFRESH_TTL_MS } from '../config/session.js';

const COOKIE_NAME = 'refreshToken';
const isProduction = env.NODE_ENV === 'production';

// The frontend and the API share the same site, so the cookie never needs
// to be sent from other sites. Strict blocks it on every cross-site request.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/api/auth',
};

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: REFRESH_TTL_MS });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export function readRefreshCookie(req: Request): string | undefined {
  // cookie-parser turns `j:` values into objects; a real token is always a non-empty string.
  const value: unknown = req.cookies?.[COOKIE_NAME];
  return typeof value === 'string' && value !== '' ? value : undefined;
}
