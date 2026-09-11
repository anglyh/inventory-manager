import { describe, expect, it } from 'vitest';
import { createProductSchema, updateProductSchema } from '../../schemas/product.schema.js';
import { movementItemSchema, saleItemSchema, purchaseItemSchema } from '../../schemas/inventory-movement.schema.js';

describe('Monetary input precision', () => {
  const schemas = [createProductSchema.shape.salePrice, updateProductSchema.shape.salePrice, movementItemSchema.shape.unitPrice, saleItemSchema.shape.salePrice, purchaseItemSchema.shape.unitCost];

  it.each([0, 1, 1.2, 1.23, 0.29, 12.50, 99999999.99])('accepts %s', value => {
    for (const schema of schemas) expect(schema.safeParse(value).success).toBe(true);
  });

  it.each([1.234, 0.001, 12.3456, -1, 100000000, Infinity, NaN])('rejects %s', value => {
    for (const schema of schemas) expect(schema.safeParse(value).success).toBe(false);
  });

  it('checks precision after coercing product form values', () => {
    for (const schema of [createProductSchema, updateProductSchema]) {
      expect(schema.safeParse({ name: 'Agua', salePrice: '1.234' }).success).toBe(false);
      expect(schema.parse({ name: 'Agua', salePrice: '1.23' }).salePrice).toBe(1.23);
    }
  });
});
