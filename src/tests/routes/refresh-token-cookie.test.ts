import cookieParser from 'cookie-parser';
import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../config.js', () => ({ env: { NODE_ENV: 'production' } }));

const { clearRefreshCookie, readRefreshCookie, setRefreshCookie } = await import('../../lib/refresh-token-cookie.js');

describe('refresh token cookie', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(cookieParser());
    app.post('/api/auth/login', (req, res) => { setRefreshCookie(res, 'opaque-token'); res.end(); });
    app.post('/api/auth/logout', (req, res) => { clearRefreshCookie(res); res.end(); });
    app.get('/api/auth/read', (req, res) => { res.json({ token: readRefreshCookie(req) ?? null }); });
    await new Promise<void>(resolve => { server = app.listen(0, () => resolve()); });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterAll(() => {
    server.close();
  });

  it('is HttpOnly, Secure in production, SameSite=Strict and scoped to /api/auth', async () => {
    const cookie = (await fetch(`${baseUrl}/api/auth/login`, { method: 'POST' })).headers.get('set-cookie') ?? '';

    expect(cookie).toMatch(/^refreshToken=opaque-token;/);
    expect(cookie).toMatch(/; HttpOnly/i);
    expect(cookie).toMatch(/; Secure/i);
    expect(cookie).toMatch(/; SameSite=Strict/i);
    expect(cookie).toMatch(/; Path=\/api\/auth/);
    expect(cookie).toMatch(/; Max-Age=604800/); // 7 days
  });

  it('clearing uses the same path so the browser really drops it', async () => {
    const cookie = (await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' })).headers.get('set-cookie') ?? '';

    expect(cookie).toMatch(/^refreshToken=;/);
    expect(cookie).toMatch(/; Path=\/api\/auth/);
    expect(cookie).toMatch(/; Expires=Thu, 01 Jan 1970/);
  });

  it('reads only plain string values', async () => {
    const read = async (cookie: string) => {
      const body = await (await fetch(`${baseUrl}/api/auth/read`, { headers: { cookie } })).json() as { token: string | null };
      return body.token;
    };

    expect(await read('refreshToken=abc')).toBe('abc');
    expect(await read('other=abc')).toBeNull();
    expect(await read('refreshToken=')).toBeNull();
    // cookie-parser would turn this into an object; it must not reach the hash function.
    expect(await read(`refreshToken=${encodeURIComponent('j:{"a":1}')}`)).toBeNull();
  });
});
