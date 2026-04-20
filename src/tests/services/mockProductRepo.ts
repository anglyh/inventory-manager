import { vi } from 'vitest';
import type { IProductRepository } from '../../interfaces/repositories/product.repository.interface.js';

export const mockProductRepo: IProductRepository = {
  findById: vi.fn(),
  listAll: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deactivate: vi.fn(),
  getStock: vi.fn(),
  findByIdForUpdate: vi.fn(),
  updateUnitCostAvg: vi.fn(),
  listProductOptions: vi.fn(),
  getByName: vi.fn(),
}