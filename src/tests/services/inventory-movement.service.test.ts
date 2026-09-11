import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryMovementService from '../../services/inventory-movement.service.js';
import InventoryMovementRepository from '../../repositories/inventory-movement.repository.js';
import ProductRepository from '../../repositories/product.repository.js';
import { saleSchema, purchaseSchema, lossSchema, initialLoadSchema, adjustmentSchema } from '../../schemas/inventory-movement.schema.js';
import { query } from '../../db/index.js';

vi.mock('../../db/index.js', () => ({ query: vi.fn() }));
vi.mock('../../db/transactions.js', () => ({ withTransaction: (fn: (client: unknown) => unknown) => fn({}) }));

const productId = '00000000-0000-4000-8000-000000000001';
const items = [{ productId, quantity: 2, unitPrice: 10 }];
const saleItems = [{ productId, quantity: 2, salePrice: 10 }];
const purchaseItems = [{ productId, quantity: 2, unitCost: 10 }];

describe('Inventory movements', () => {
  const repo = new InventoryMovementRepository();
  const products = new ProductRepository();
  const service = new InventoryMovementService(repo, products);

  beforeEach(() => vi.restoreAllMocks());

  it('requires payment for sales and rejects fields belonging to other operations', () => {
    expect(saleSchema.safeParse({ items: saleItems }).success).toBe(false);
    expect(saleSchema.safeParse({ paymentMethod: 'CASH', supplierId: productId, items: saleItems }).success).toBe(false);
    expect(purchaseSchema.safeParse({ cashRegisterId: productId, items: purchaseItems }).success).toBe(false);
    expect(lossSchema.safeParse({ reason: 'LOSS_THEFT', paymentMethod: 'CASH', items }).success).toBe(false);
    expect(lossSchema.safeParse({ reason: 'SALE', items }).success).toBe(false);
    expect(saleSchema.safeParse({ reason: 'PURCHASE', paymentMethod: 'CASH', items: saleItems }).success).toBe(false);
    expect(purchaseSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('accepts sales and purchases without reason, rejecting client-assigned reason or direction', () => {
    expect(saleSchema.safeParse({ paymentMethod: 'CASH', items: saleItems }).success).toBe(true);
    expect(purchaseSchema.safeParse({ items: purchaseItems }).success).toBe(true);
    expect(saleSchema.safeParse({ reason: 'SALE', paymentMethod: 'CASH', items: saleItems }).success).toBe(false);
    expect(purchaseSchema.safeParse({ reason: 'PURCHASE', items: purchaseItems }).success).toBe(false);
    expect(saleSchema.safeParse({ movementType: 'IN', paymentMethod: 'CASH', items: saleItems }).success).toBe(false);
    expect(purchaseSchema.safeParse({ movementType: 'OUT', items: purchaseItems }).success).toBe(false);
    expect(lossSchema.safeParse({ items }).success).toBe(false);
  });

  it('rejects ambiguous or operation-inappropriate price fields', () => {
    for (const invalidItems of [items, purchaseItems, [{ ...saleItems[0], unitPrice: 5 }], [{ ...saleItems[0], unitCost: 5 }]]) {
      expect(saleSchema.safeParse({ paymentMethod: 'CASH', items: invalidItems }).success).toBe(false);
    }
    for (const invalidItems of [items, saleItems, [{ ...purchaseItems[0], unitPrice: 5 }], [{ ...purchaseItems[0], salePrice: 5 }]]) {
      expect(purchaseSchema.safeParse({ items: invalidItems }).success).toBe(false);
    }
  });

  // it('validates returns, initial loads and adjustment-specific fields', () => {
  //   for (const schema of [customerReturnSchema, supplierReturnSchema, initialLoadSchema]) {
  //     expect(schema.safeParse({ items }).success).toBe(true);
  //     expect(schema.safeParse({ items, reason: 'SALE' }).success).toBe(false);
  //     expect(schema.safeParse({ items, movementType: 'OUT' }).success).toBe(false);
  //     expect(schema.safeParse({ items, cashRegisterId: productId }).success).toBe(false);
  //   }
  //   expect(customerReturnSchema.safeParse({ items, supplierId: productId }).success).toBe(false);
  //   expect(adjustmentSchema.safeParse({ reason: 'MANUAL_CORRECTION', items }).success).toBe(false);
  //   expect(adjustmentSchema.safeParse({ reason: 'COUNT_SURPLUS', movementType: 'OUT', items }).success).toBe(false);
  //   expect(adjustmentSchema.safeParse({ reason: 'PURCHASE', items }).success).toBe(false);
  // });

  it.each([
    ['INITIAL_LOAD', 'IN'],
    ['COUNT_SURPLUS', 'IN'], ['COUNT_SHORTAGE', 'OUT'],
    ['MANUAL_CORRECTION', 'IN'], ['MANUAL_CORRECTION', 'OUT'],
  ] as const)('registers %s in direction %s', async (reason, movementType) => {
    vi.spyOn(products, 'findByIdForUpdate').mockResolvedValue({ id: productId, storeId: 'store', isActive: true, unitCostAvg: '3.00' } as Awaited<ReturnType<typeof products.findByIdForUpdate>>);
    vi.spyOn(products, 'getStock').mockResolvedValue(10);
    const update = vi.spyOn(products, 'updateUnitCostAvg').mockResolvedValue();
    const create = vi.spyOn(repo, 'create').mockImplementation(async data => ({
      ...data, id: 'movement', status: 'COMPLETED', voidedAt: null, voidReason: null, createdAt: new Date(),
    }));
    const insert = vi.spyOn(repo, 'createMovementItems').mockImplementation(async (_id, rows) => rows.map(row => ({ ...row, unitPrice: row.unitPrice.toFixed(2), unitCost: row.unitCost.toFixed(2) })));
    switch (reason) {
      case 'INITIAL_LOAD': await service.registerInitialLoad('store', { items }); break;
      case 'MANUAL_CORRECTION': await service.registerAdjustment('store', { items, reason, movementType }); break;
      default: await service.registerAdjustment('store', { items, reason });
    }
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      storeId: 'store', reason, movementType,
      supplierId: null,
    }), {});
    expect(insert).toHaveBeenCalledWith('movement', [{ ...items[0], unitCost: reason === 'INITIAL_LOAD' ? 10 : 3 }], {});
    if (reason === 'INITIAL_LOAD') expect(update).toHaveBeenCalledWith(productId, 4.17, {});
    else expect(update).not.toHaveBeenCalled();
  });

  it.each(['sale', 'purchase', 'loss'] as const)('registers a %s with the correct direction and cost', async operation => {
    vi.spyOn(products, 'findByIdForUpdate').mockResolvedValue({ id: productId, storeId: 'store', isActive: true, unitCostAvg: '3.00' } as Awaited<ReturnType<typeof products.findByIdForUpdate>>);
    vi.spyOn(products, 'getStock').mockResolvedValue(10);
    const update = vi.spyOn(products, 'updateUnitCostAvg').mockResolvedValue();
    const create = vi.spyOn(repo, 'create').mockImplementation(async data => ({
      ...data, id: 'movement', status: 'COMPLETED', voidedAt: null, voidReason: null, createdAt: new Date(),
    }));
    const insert = vi.spyOn(repo, 'createMovementItems').mockImplementation(async (_id, rows) => rows.map(row => ({ ...row, unitPrice: row.unitPrice.toFixed(2), unitCost: row.unitCost.toFixed(2) })));
    const result = operation === 'sale'
      ? await service.registerSale('store', { paymentMethod: 'CASH', cashRegisterId: productId, items: saleItems })
      : operation === 'purchase'
        ? await service.registerPurchase('store', { supplierId: productId, items: purchaseItems })
        : await service.registerLoss('store', { reason: 'LOSS_DAMAGED', items });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      storeId: 'store',
      reason: operation === 'sale' ? 'SALE' : operation === 'purchase' ? 'PURCHASE' : 'LOSS_DAMAGED',
      movementType: operation === 'purchase' ? 'IN' : 'OUT',
      paymentMethod: operation === 'sale' ? 'CASH' : null,
      supplierId: operation === 'purchase' ? productId : null,
      cashRegisterId: operation === 'sale' ? productId : null,
    }), {});
    expect(insert).toHaveBeenCalledWith('movement', [{ ...items[0], unitCost: operation === 'purchase' ? 10 : 3 }], {});
    expect(result.totalAmount).toBe('20.00');
    expect(result.items[0]).toMatchObject({ unitPrice: '10.00', unitCost: operation === 'purchase' ? '10.00' : '3.00' });
    expect(result.reason).toBe(operation === 'sale' ? 'SALE' : operation === 'purchase' ? 'PURCHASE' : 'LOSS_DAMAGED');
    if (operation === 'purchase') expect(update).toHaveBeenCalledWith(productId, 4.17, {});
    else expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['sales', 'COMPLETED', ['SALE']],
    ['purchase', 'COMPLETED', ['PURCHASE']],
    ['loss', 'COMPLETED', ['LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SHORTAGE']],
    ['voids', 'VOIDED', undefined],
  ] as const)('filters %s by status and reason within the store', async (group, status, reasons) => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await repo.listMovementsByCursor({ storeId: 'store', group, limit: 2 });
    const [sql, params] = vi.mocked(query).mock.calls.at(-1)!;
    expect(sql).toContain('m.store_id = $1');
    expect(sql).toContain('m.status = $2');
    expect(params).toEqual(reasons ? ['store', status, reasons, 3] : ['store', status, 3]);
    if (reasons) expect(sql).toContain('m.reason = ANY(');
    else expect(sql).not.toContain('m.reason = ANY(');
  });

  it.each([
    ['IN', undefined, 'COMPLETED', undefined],
    ['OUT', undefined, 'COMPLETED', undefined],
    ['OUT', 'sales', 'COMPLETED', ['SALE']],
    ['IN', 'voids', 'VOIDED', undefined],
  ] as const)('combines direction %s and group %s with the store and cursor in SQL', async (movementType, group, status, reasons) => {
    const cursorDate = '2026-09-10T12:00:00.000Z';
    vi.mocked(query).mockResolvedValue({ rows: [] } as never);
    await repo.listMovementsByCursor({ storeId: 'store', movementType, group, cursorDate, cursorId: productId, limit: 2 });
    const [sql, params] = vi.mocked(query).mock.calls.at(-1)!;
    expect(sql).toContain('m.store_id = $1');
    expect(sql).toContain('m.created_at < $2');
    expect(sql).toContain('m.id < $3');
    expect(sql).toContain('m.movement_type = $4');
    expect(sql).toContain('m.status = $5');
    expect(params).toEqual(['store', cursorDate, productId, movementType, status, ...(reasons ? [reasons] : []), 3]);
    if (reasons) expect(sql).toContain('m.reason = ANY($6::movement_reason[])');
    else expect(sql).not.toContain('m.reason = ANY(');
  });

  it('uses the last returned row as cursor, preserving the extra row for the next page', async () => {
    const date = new Date('2026-01-01');
    vi.spyOn(repo, 'listMovementsByCursor').mockResolvedValue([
      { id: '3', createdAt: date }, { id: '2', createdAt: date }, { id: '1', createdAt: date },
    ] as Awaited<ReturnType<typeof repo.listMovementsByCursor>>);
    const page = await service.listMovementsByCursor({ storeId: 'store', limit: 2, group: 'sales' });
    expect(page.data.map(row => row.id)).toEqual(['3', '2']);
    expect(page.nextCursor?.cursorId).toBe('2');
  });

  // it('keeps average cost on customer returns instead of using the sale price', async () => {
  //   vi.spyOn(products, 'findByIdForUpdate').mockResolvedValue({ id: productId, storeId: 'store', isActive: true, unitCostAvg: '3.00' } as Awaited<ReturnType<typeof products.findByIdForUpdate>>);
  //   const update = vi.spyOn(products, 'updateUnitCostAvg');
  //   vi.spyOn(repo, 'create').mockResolvedValue({ id: 'movement', movementType: 'IN', reason: 'CUSTOMER_RETURN', status: 'COMPLETED', notes: null } as Awaited<ReturnType<typeof repo.create>>);
  //   const insert = vi.spyOn(repo, 'createMovementItems').mockResolvedValue([]);
  //   await service.registerCustomerReturn('store', { items });
  //   expect(update).not.toHaveBeenCalled();
  //   expect(insert).toHaveBeenCalledWith('movement', [{ ...items[0], unitCost: 3 }], {});
  // });

  it('checks total quantity across duplicate products for stock shortages', async () => {
    vi.spyOn(products, 'findByIdForUpdate').mockResolvedValue({ id: productId, storeId: 'store', isActive: true, unitCostAvg: '3.00' } as Awaited<ReturnType<typeof products.findByIdForUpdate>>);
    vi.spyOn(products, 'getStock').mockResolvedValue(3);
    await expect(service.registerLoss('store', { reason: 'LOSS_DAMAGED', items: [...items, ...items] })).rejects.toThrow('Stock insuficiente');
  });
});
