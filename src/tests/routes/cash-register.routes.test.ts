import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import cashRegisterRouter from '../../routes/cash-register.routes.js';
import { query } from '../../db/index.js';
import { errorHandler } from '../../middlewares/error-handler.middleware.js';

vi.mock('../../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const registerRow = (summary: Record<string, unknown>) => ({
  id: 'register', opened_at: '2026-10-05T10:00:00.000Z', opening_amount: '100.00',
  opened_by: 'user-1', opened_by_name: 'Ana', notes: null, closed_at: null,
  closing_amount: null, closed_by: null, closed_by_name: null, closing_notes: null,
  status: 'OPEN', summary,
});

describe('Cash register authenticated read views', () => {
  let server: Server;
  let baseUrl: string;
  let role: 'ADMIN' | 'GUEST' = 'ADMIN';

  beforeAll(async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { userId: 'user-1', storeId: 'store-1', name: 'Ana', email: 'ana@example.com', role };
      next();
    });
    app.use('/api/cash-register', cashRegisterRouter);
    app.use(errorHandler);
    server = await new Promise<Server>(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    baseUrl = `http://127.0.0.1:${address.port}/api/cash-register`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    role = 'ADMIN';
    vi.mocked(query).mockImplementation(async sql => ({
      rows: [registerRow(sql.includes("'expectedCash', t.expected_cash::text")
        ? { cashSales: '20.00', expectedCash: '120.00', salesCount: 1, difference: null }
        : { cashSales: '20.00', salesCount: 1, difference: null })],
    } as never));
  });

  it('returns expectedCash to ADMIN in the final current-register JSON', async () => {
    const response = await fetch(`${baseUrl}/current`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      openedByName: 'Ana', closedByName: null, summary: { expectedCash: '120.00' },
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("'expectedCash', t.expected_cash::text"), ['store-1']);
  });

  it('returns caja history with page metadata and applies the status filter', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ ...registerRow({ expectedCash: '120.00' }), total_count: '3' }] } as never);
    const response = await fetch(`${baseUrl}?page=2&limit=2&status=CLOSED`);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ meta: { page: 2, limit: 2, total: 3, totalPages: 2 } });
    expect(json).not.toHaveProperty('nextCursor');
    expect(vi.mocked(query).mock.calls[0]?.[0]).toContain('cr.closed_at IS NOT NULL');
    expect(vi.mocked(query).mock.calls[0]?.[1]).toEqual(['store-1', 2, 2]);
  });

  it('omits expectedCash from the final GUEST JSON and SQL projection', async () => {
    role = 'GUEST';
    const response = await fetch(`${baseUrl}/current`);
    expect(response.status).toBe(200);
    const json = await response.json() as { summary: Record<string, unknown> };
    expect(json.summary).not.toHaveProperty('expectedCash');
    expect(JSON.stringify(json)).not.toContain('expectedCash');
    const sql = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    expect(sql).not.toContain("'expectedCash', t.expected_cash::text");
    expect(sql).toContain("cr.closing_summary - 'expectedCash'");
  });

  it('keeps difference visible but removes expectedCash from a closed blind-view JSON response', async () => {
    role = 'GUEST';
    vi.mocked(query).mockResolvedValueOnce({
      rows: [{ ...registerRow({ difference: '-5.00' }), status: 'CLOSED', closed_at: '2026-10-05T12:00:00.000Z', closing_amount: '115.00' }],
    } as never);
    const response = await fetch(`${baseUrl}/00000000-0000-4000-8000-000000000001`);
    expect(response.status).toBe(200);
    const json = await response.json() as { summary: Record<string, unknown> };
    expect(json.summary).toEqual({ difference: '-5.00' });
    expect(json.summary).not.toHaveProperty('expectedCash');
    expect(vi.mocked(query).mock.calls[0]?.[0]).toContain("cr.closing_summary - 'expectedCash'");
  });

  it('returns movement page metadata and creator name without total_count', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [registerRow({})] } as never)
      .mockResolvedValueOnce({ rows: [{
        id: 'movement-1', cash_register_id: 'register-1', type: 'CASH_IN', amount: '5.00',
        reason: 'cambio', created_by: 'user-1', created_by_name: 'Ana',
        created_at: '2026-10-05T10:00:00.000Z', total_count: '3',
      }] } as never);
    const response = await fetch(`${baseUrl}/00000000-0000-4000-8000-000000000001/movements?page=2&limit=2`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{
        id: 'movement-1', cashRegisterId: 'register-1', type: 'CASH_IN', amount: '5.00',
        reason: 'cambio', createdBy: 'user-1', createdByName: 'Ana',
        createdAt: '2026-10-05T10:00:00.000Z',
      }],
      meta: { page: 2, limit: 2, total: 3, totalPages: 2 },
    });
  });

  it('lists the active register movements with a default page size of five', async () => {
    role = 'GUEST';
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [registerRow({ cashSales: '20.00', salesCount: 1, difference: null })] } as never)
      .mockResolvedValueOnce({ rows: [{
        id: 'movement-1', cash_register_id: 'register', type: 'CASH_OUT', amount: '5.00',
        reason: 'compra menor', created_by: 'user-1', created_by_name: 'Ana',
        created_at: '2026-10-05T10:00:00.000Z', total_count: '8',
      }] } as never);
    const response = await fetch(`${baseUrl}/current/movements`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{
        id: 'movement-1', cashRegisterId: 'register', type: 'CASH_OUT', amount: '5.00',
        reason: 'compra menor', createdBy: 'user-1', createdByName: 'Ana',
        createdAt: '2026-10-05T10:00:00.000Z',
      }],
      meta: { page: 1, limit: 5, total: 8, totalPages: 2 },
    });
    expect(vi.mocked(query).mock.calls[0]?.[0]).not.toContain("'expectedCash', t.expected_cash::text");
    expect(vi.mocked(query).mock.calls[1]?.[1]).toEqual(['store-1', 'register', 5, 0]);
  });

  it('returns an empty page when no register is currently open', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);
    const response = await fetch(`${baseUrl}/current/movements`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejects a movement page limit above 100 before running queries', async () => {
    const response = await fetch(`${baseUrl}/00000000-0000-4000-8000-000000000001/movements?limit=101`);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(query).not.toHaveBeenCalled();
  });
});
