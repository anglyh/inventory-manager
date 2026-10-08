import express from 'express';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type swaggerJSDoc from 'swagger-jsdoc';
import inventoryMovementRouter from '../../routes/inventory-movement.routes.js';
import { inventoryMovementService } from '../../container.js';
import { errorHandler } from '../../middlewares/error-handler.middleware.js';
import { ConflictError, NotFoundError } from '../../errors/app.error.js';
import { swaggerSpec as generatedSpec } from '../../config/swagger.js';

const swaggerSpec = generatedSpec as swaggerJSDoc.OAS3Definition;
const postResponses = (path: string) => swaggerSpec.paths![path]!.post!.responses!;

vi.mock('../../container.js', () => ({
  inventoryMovementService: {
    registerSale: vi.fn(), registerPurchase: vi.fn(), registerLoss: vi.fn(),
    registerInitialLoad: vi.fn(), registerAdjustment: vi.fn(), listMovementsByCursor: vi.fn(),
  },
}));

const productId = '00000000-0000-4000-8000-000000000001';
const items = [{ productId, quantity: 2, unitPrice: 10 }];
const operations = [
  { path: 'sales', method: 'registerSale', body: { paymentMethod: 'CASH', items: [{ productId, quantity: 2, salePrice: 10 }] } },
  { path: 'purchases', method: 'registerPurchase', body: { items: [{ productId, quantity: 2, unitCost: 10 }] } },
  { path: 'losses', method: 'registerLoss', body: { reason: 'LOSS_DAMAGED', items } },
  { path: 'initial-loads', method: 'registerInitialLoad', body: { items } },
  { path: 'adjustments', method: 'registerAdjustment', body: { reason: 'MANUAL_CORRECTION', movementType: 'IN', items } },
] as const;

describe('Inventory movement HTTP contracts', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { userId: 'user', storeId: 'store', name: 'User', email: 'user@example.com', role: 'ADMIN' };
      next();
    });
    app.use('/api/inventory-movement', inventoryMovementRouter);
    app.use(errorHandler);
    server = await new Promise<Server>(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    baseUrl = `http://127.0.0.1:${address.port}/api/inventory-movement`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const post = (path: string, body: unknown) => fetch(`${baseUrl}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  it.each(operations)('registers $path with an empty 204 matching Swagger', async ({ path, method, body }) => {
    // Incluso si el servicio produce un resultado interno, no debe enviarse al cliente.
    vi.mocked(inventoryMovementService[method]).mockResolvedValue({
      id: 'movement', movementType: 'OUT', reason: 'SALE', status: 'COMPLETED',
      notes: null, totalAmount: '20.00', items: [{ productId, quantity: 2, unitPrice: '10.00', unitCost: '3.00' }],
    });
    const response = await post(path, body);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('content-type')).toBeNull();
    expect(inventoryMovementService[method]).toHaveBeenCalledWith('store', body);
    const documented = postResponses(`/api/inventory-movement/${path}`);
    expect(documented['204']).toBeDefined();
    expect(documented['204']).not.toHaveProperty('content');
    expect(documented['201']).toBeUndefined();
  });

  it.each(operations)('preserves JSON errors for $path instead of confirming success', async ({ path, method, body }) => {
    vi.mocked(inventoryMovementService[method]).mockRejectedValue(new ConflictError('Stock insuficiente'));
    const response = await post(path, body);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'CONFLICT', message: 'Stock insuficiente' } });
  });

  it.each(['sales', 'purchases'])('returns the documented 422 for invalid %s input', async path => {
    const response = await post(path, { items: [] });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR', fields: expect.any(Array) } });
    expect(inventoryMovementService.registerSale).not.toHaveBeenCalled();
    expect(inventoryMovementService.registerPurchase).not.toHaveBeenCalled();
    expect(postResponses(`/api/inventory-movement/${path}`)['422']).toBeDefined();
  });

  it('keeps missing product errors as 404', async () => {
    vi.mocked(inventoryMovementService.registerSale).mockRejectedValue(new NotFoundError('El producto no existe'));
    const response = await post('sales', operations[0].body);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it.each([
    { query: '', filters: {} },
    { query: 'movementType=IN', filters: { movementType: 'IN' } },
    { query: 'movementType=OUT', filters: { movementType: 'OUT' } },
    { query: 'group=sales', filters: { group: 'sales' } },
    { query: 'movementType=IN&group=purchase', filters: { movementType: 'IN', group: 'purchase' } },
    { query: 'movementType=OUT&group=loss', filters: { movementType: 'OUT', group: 'loss' } },
    { query: 'movementType=IN&group=voids', filters: { movementType: 'IN', group: 'voids' } },
    { query: 'movementType=IN&group=sales', filters: { movementType: 'IN', group: 'sales' } },
  ])('passes validated history filters to the service: $query', async ({ query, filters }) => {
    vi.mocked(inventoryMovementService.listMovementsByCursor).mockResolvedValue({ data: [], nextCursor: null });
    const response = await fetch(`${baseUrl}?${query}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [], nextCursor: null });
    expect(inventoryMovementService.listMovementsByCursor).toHaveBeenCalledWith({ storeId: 'store', ...filters, limit: 12 });
  });

  it('preserves direction, group and cursor pagination in the same request', async () => {
    const filters = {
      movementType: 'OUT', group: 'sales', limit: '2',
      cursorDate: '2026-09-10T12:00:00.000Z', cursorId: productId,
    };
    const page = { data: [], nextCursor: { cursorDate: '2026-09-09T12:00:00.000Z', cursorId: productId } };
    vi.mocked(inventoryMovementService.listMovementsByCursor).mockResolvedValue(page);
    const response = await fetch(`${baseUrl}?${new URLSearchParams(filters)}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(page);
    expect(inventoryMovementService.listMovementsByCursor).toHaveBeenCalledWith({ ...filters, storeId: 'store', limit: 2 });
  });

  it.each([
    ['movementType=INVALID', 'movementType'],
    ['movementType=in', 'movementType'],
    ['movementType=', 'movementType'],
    ['movementType=IN&movementType=OUT', 'movementType'],
    ['movementType=OUT&group=invalid', 'group'],
    ['movementType=IN&limit=101', 'limit'],
    [`movementType=OUT&cursorId=${productId}`, 'cursorId'],
  ])('rejects invalid history query %s with 422', async (query, field) => {
    const response = await fetch(`${baseUrl}?${query}`);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', fields: expect.arrayContaining([expect.objectContaining({ field })]) },
    });
    expect(inventoryMovementService.listMovementsByCursor).not.toHaveBeenCalled();
  });

  it.each(['entries', 'exits'])('removes the old /%s route and its Swagger documentation', async path => {
    const response = await fetch(`${baseUrl}/${path}`);
    expect(response.status).toBe(404);
    expect(inventoryMovementService.listMovementsByCursor).not.toHaveBeenCalled();
    expect(swaggerSpec.paths).not.toHaveProperty(`/api/inventory-movement/${path}`);
  });
});

describe('Swagger response coverage', () => {
  it('documents direction and group as optional filters on the unified history endpoint', () => {
    const parameters = swaggerSpec.paths!['/api/inventory-movement']!.get!.parameters;
    expect(parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ in: 'query', name: 'movementType', schema: { type: 'string', enum: ['IN', 'OUT'] } }),
      expect.objectContaining({ in: 'query', name: 'group' }),
      expect.objectContaining({ in: 'query', name: 'cursorDate' }),
      expect.objectContaining({ in: 'query', name: 'cursorId' }),
    ]));
    expect(parameters?.find(parameter => 'name' in parameter && parameter.name === 'movementType')).not.toHaveProperty('required', true);
  });

  it('resolves every local reference', () => {
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (key === '$ref') {
          expect(typeof child).toBe('string');
          const parts = (child as string).replace(/^#\//, '').split('/');
          let target: any = swaggerSpec;
          for (const part of parts) target = target?.[part];
          expect(target, `Unresolved reference: ${child}`).toBeDefined();
        } else visit(child);
      }
    };
    visit(swaggerSpec);
  });

  it('documents JSON schemas for successful responses and omits content on 204', () => {
    for (const path of Object.values(swaggerSpec.paths!) as swaggerJSDoc.PathItem[]) {
      for (const operation of Object.values(path) as any[]) {
        for (const [status, response] of Object.entries(operation.responses) as [string, any][]) {
          if (status === '204') expect(response).not.toHaveProperty('content');
          else if (status.startsWith('2')) expect(response.content?.['application/json']?.schema).toBeDefined();
        }
      }
    }
  });
});
