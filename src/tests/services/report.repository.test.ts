import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../../db/index.js';
import ReportRepository from '../../repositories/report.repository.js';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

const repo = new ReportRepository();
const range = { storeId: 's1', from: new Date('2026-10-01T05:00:00Z'), to: new Date('2026-11-01T05:00:00Z') };

describe('Report repository totals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nets cash surpluses against shortages in the net profit and keeps the register out of store losses', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{}] } as never);
    await repo.getTotals(range);

    const sql = (vi.mocked(query).mock.calls[0]?.[0] ?? '').replace(/\s+/g, ' ');
    expect(sql).toContain('- cash_shortage + cash_surplus - general_expenses AS net');
    expect(sql).toContain('AS cash_surplus');
    // Store losses and count surpluses are reported apart, never mixed with the cash register.
    expect(sql).toContain('loss.expired + loss.damaged + loss.count_shortage AS store_losses');
    expect(sql).not.toMatch(/count_surplus\s*\+\s*register\.cash_shortage/);
  });
});
