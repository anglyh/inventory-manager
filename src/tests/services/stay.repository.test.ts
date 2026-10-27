import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../../db/index.js';
import StayRepository from '../../repositories/stay.repository.js';
import { stayListQuerySchema } from '../../schemas/stay.schema.js';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

const repo = new StayRepository();

describe('Stay repository list filters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists only unreported stays with a foreign guest when migrations=pending', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never).mockResolvedValueOnce({ rows: [{ total: '0' }] } as never);
    await repo.list('s1', stayListQuerySchema.parse({ migrations: 'pending' }));

    const [listSql, countSql] = vi.mocked(query).mock.calls.map(call => call[0]);
    for (const sql of [listSql, countSql]) {
      const where = (sql ?? '').split('WHERE st.store_id = $1')[1] ?? '';
      expect(where).toContain('st.migrations_reported_at IS NULL');
      expect(where).toContain("document_type IN ('CE', 'PASSPORT', 'PTP')");
    }
  });
});
