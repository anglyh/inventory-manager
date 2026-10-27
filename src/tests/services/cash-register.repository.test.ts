import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../../db/index.js';
import CashRegisterRepository from '../../repositories/cash-register.repository.js';
import { cashMovementHistorySchema, cashRegisterHistorySchema, currentCashMovementHistorySchema } from '../../schemas/cash-register.schema.js';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

const repo = new CashRegisterRepository();
const movement = { id: 'm1', cash_register_id: 'r1', type: 'CASH_IN', amount: '5.00', reason: 'change', created_by: null, created_by_name: null, created_at: '2026-10-05T10:00:00.000Z' };
const register = { id: 'r1', opening_amount: '100.00', opened_at: '2026-10-05T10:00:00.000Z', opened_by: null, opened_by_name: null, closed_at: null, closing_amount: null, closed_by: null, closed_by_name: null, closing_notes: null, notes: null, status: 'OPEN', summary: {} };

describe('Cash register repository read contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('projects all summary values in full and only the sales count in blind SQL', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [] } as never);
    await repo.findCurrent('s1', 'full');
    await repo.findCurrent('s1', 'blind');
    const fullSql = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    const blindSql = vi.mocked(query).mock.calls[1]?.[0] ?? '';
    expect(fullSql).toContain("'expectedCash', t.expected_cash::text");
    // GUEST gets neither the expected cash nor the amounts that add up to it.
    for (const column of ['expected_cash', 'cash_sales', 'cash_stays', 'cash_in', 'cash_out', 'yape_sales', 'total_sales']) {
      expect(blindSql).not.toContain(`t.${column}`);
    }
    expect(blindSql).toContain("'salesCount', t.sales_count");
    expect(blindSql).not.toMatch(/ELSE cr\.closing_summary\s/);
    expect(blindSql).toContain('opened_user.name AS opened_by_name');
    expect(blindSql).toContain('closed_user.name AS closed_by_name');
    expect(blindSql.split('FROM cash_register AS cr')[0]).not.toContain('cr.store_id');
  });

  it.each([
    { page: 1, limit: 2, rows: [movement, { ...movement, id: 'm2' }], expectedOffset: 0, total: '5' },
    { page: 2, limit: 2, rows: [movement, { ...movement, id: 'm2' }], expectedOffset: 2, total: '5' },
    { page: 3, limit: 2, rows: [{ ...movement, id: 'm5' }], expectedOffset: 4, total: '5' },
  ])('uses LIMIT/OFFSET on page $page and removes total_count from movement rows', async ({ page, limit, rows, expectedOffset, total }) => {
    vi.mocked(query).mockResolvedValueOnce({ rows: rows.map(row => ({ ...row, total_count: total })) } as never);
    const result = await repo.listMovements('s1', 'r1', { page, limit });
    expect(result).toEqual({ data: expect.arrayContaining([expect.objectContaining({ createdByName: null })]), total: 5 });
    expect(result.data[0]!).not.toHaveProperty('totalCount');
    const sql = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    expect(sql).toContain('ORDER BY cm.created_at DESC, cm.id DESC\n      LIMIT $3 OFFSET $4');
    expect(sql).toContain('COUNT(*) OVER() AS total_count');
    expect(sql).toContain('creator.name AS created_by_name');
    expect(sql.split('FROM cash_register_movement AS cm')[0]).not.toContain('store_id');
    expect(vi.mocked(query).mock.calls[0]?.[1]).toEqual(['s1', 'r1', limit, expectedOffset]);
  });

  it('runs a filtered count when the requested page is outside the range', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [{ total: '7' }] } as never);
    const result = await repo.listMovements('s1', 'r1', { page: 8, limit: 3 });
    expect(result).toEqual({ data: [], total: 7 });
    expect(vi.mocked(query)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(query).mock.calls[1]?.[0]).toContain('COUNT(*) AS total');
    expect(vi.mocked(query).mock.calls[1]?.[0]).toContain('cr.store_id = $1 AND cr.id = $2');
    expect(vi.mocked(query).mock.calls[1]?.[1]).toEqual(['s1', 'r1']);
  });

  it.each([
    { page: 1, limit: 2, rows: [register, { ...register, id: 'r2' }], offset: 0, total: '5' },
    { page: 2, limit: 2, rows: [register, { ...register, id: 'r2' }], offset: 2, total: '5' },
    { page: 3, limit: 2, rows: [{ ...register, id: 'r5' }], offset: 4, total: '5' },
  ])('paginates caja history page $page with OFFSET and stable order', async ({ page, limit, rows, offset, total }) => {
    vi.mocked(query).mockResolvedValueOnce({ rows: rows.map(row => ({ ...row, total_count: total })) } as never);
    const result = await repo.list('s1', { page, limit });
    expect(result.data).toHaveLength(rows.length);
    expect(result.total).toBe(5);
    expect(result.data[0]!).not.toHaveProperty('totalCount');
    const sql = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    expect(sql).toContain('ORDER BY cr.opened_at DESC, cr.id DESC');
    expect(sql).toContain('COUNT(*) OVER() AS total_count');
    expect(sql).toContain('LIMIT $2 OFFSET $3');
    expect(vi.mocked(query).mock.calls[0]?.[1]).toEqual(['s1', limit, offset]);
  });

  it('retains total for an out-of-range caja history page', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [{ total: '6' }] } as never);
    const result = await repo.list('s1', { page: 4, limit: 2, status: 'CLOSED' });
    expect(result).toEqual({ data: [], total: 6 });
    expect(vi.mocked(query)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(query).mock.calls[1]?.[0]).toContain('cr.closed_at IS NOT NULL');
    expect(vi.mocked(query).mock.calls[1]?.[1]).toEqual(['s1']);
  });

  it('defaults movement pagination and rejects limit above 100', () => {
    expect(cashMovementHistorySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(cashMovementHistorySchema.parse({ page: '2', limit: '100' })).toEqual({ page: 2, limit: 100 });
    expect(cashMovementHistorySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(cashMovementHistorySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('defaults caja history to page 1 and limit 12, and rejects cursors and invalid pages', () => {
    expect(cashRegisterHistorySchema.parse({})).toEqual({ page: 1, limit: 12 });
    expect(cashRegisterHistorySchema.parse({ page: '2', limit: '100', status: 'CLOSED' })).toEqual({ page: 2, limit: 100, status: 'CLOSED' });
    expect(cashRegisterHistorySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(cashRegisterHistorySchema.safeParse({ cursorDate: '2026-10-05T10:00:00Z', cursorId: '00000000-0000-4000-8000-000000000001' }).success).toBe(false);
  });

  it('defaults active-register movement history to five rows', () => {
    expect(currentCashMovementHistorySchema.parse({})).toEqual({ page: 1, limit: 5 });
    expect(currentCashMovementHistorySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});
