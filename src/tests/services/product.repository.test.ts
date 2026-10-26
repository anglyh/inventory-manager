import { beforeEach, describe, expect, it, vi } from 'vitest';
import { query } from '../../db/index.js';
import ProductRepository from '../../repositories/product.repository.js';
import { listProductPaginationSchema } from '../../schemas/product.schema.js';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), getClient: vi.fn() }));

const repo = new ProductRepository();
const categoryId = '550e8400-e29b-41d4-a716-446655440000';

describe('Product list category filter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters by category ids and products without category in one OR group', async () => {
    const { categoryId: filter } = listProductPaginationSchema.parse({ categoryId: `${categoryId},none` });
    expect(listProductPaginationSchema.safeParse({ categoryId: 'Bebidas' }).success).toBe(false);

    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as never);
    await repo.listAll({ storeId: 's1', ...filter, limit: 12, offset: 0 });

    const sql = vi.mocked(query).mock.calls[0]?.[0] ?? '';
    expect(sql).toContain('(p.category_id = ANY($2::uuid[]) OR p.category_id IS NULL)');
    expect(vi.mocked(query).mock.calls[0]?.[1]).toEqual(['s1', [categoryId], 12, 0]);
  });
});
