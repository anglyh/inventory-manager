import { describe, expect, it } from 'vitest';
import { createProductSchema, updateProductSchema } from '../../schemas/product.schema.js';

describe('Product body numeric fields', () => {
  const base = { name: 'Agua mineral 500ml' };

  // JSON bodies already carry real numbers; coercion would turn these into 0 or 1.
  it.each([null, '', false, true, '2.5'])('rejects salePrice %j instead of coercing it', salePrice => {
    expect(createProductSchema.safeParse({ ...base, salePrice }).success).toBe(false);
    expect(updateProductSchema.safeParse({ ...base, salePrice }).success).toBe(false);
  });

  it.each([null, '', false, '10'])('rejects minStock %j instead of coercing it', minStock => {
    expect(createProductSchema.safeParse({ ...base, salePrice: 2.5, minStock }).success).toBe(false);
    expect(updateProductSchema.safeParse({ ...base, salePrice: 2.5, minStock }).success).toBe(false);
  });

  it('accepts numeric values and defaults minStock to 0 on create', () => {
    expect(createProductSchema.parse({ ...base, salePrice: 2.5 })).toMatchObject({ salePrice: 2.5, minStock: 0 });
    expect(updateProductSchema.parse({ ...base, salePrice: 0, minStock: 10 })).toMatchObject({ salePrice: 0, minStock: 10 });
  });
});
