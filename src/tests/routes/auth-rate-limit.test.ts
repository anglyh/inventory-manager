import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authLimiter } from '../../middlewares/rate-limit.middleware.js';

describe('authLimiter', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.post('/login', authLimiter, (req, res) => {
      res.status(req.query.ok ? 200 : 401).end();
    });
    await new Promise<void>(resolve => { server = app.listen(0, () => resolve()); });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterAll(() => {
    server.close();
  });

  it('blocks after 10 failed attempts and ignores successful ones', async () => {
    const post = (path: string) => fetch(`${baseUrl}${path}`, { method: 'POST' });

    // Successful logins of the whole staff must not use up the shared IP's quota.
    for (let i = 0; i < 12; i++) expect((await post('/login?ok=1')).status).toBe(200);
    for (let i = 0; i < 10; i++) expect((await post('/login')).status).toBe(401);

    const blocked = await post('/login');
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ success: false, error: { code: 'TOO_MANY_REQUESTS' } });
  });
});
