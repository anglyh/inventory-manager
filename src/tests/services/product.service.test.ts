import { describe, expect, it, vi } from "vitest";
import ProductService from '../../services/product.service.js';
import { NotFoundError } from '../../errors/app.error.js';
import type { Product, ProductWithStock } from '../../models/product.model.js';
import { mockProductRepo } from './mockProductRepo.js';

export const fakeProductWithStock: ProductWithStock = {
  id: 'product-123',
  userId: 'user-456',
  name: 'Jabón de manos',
  salePrice: '5.50',
  barcode: null,
  unitCostAvg: '3.00',
  minStock: 10,
  categoryId: 'cat-789',
  createdAt: new Date('2025-01-01'),
  isActive: true,
  stock: 25,
};

export const fakeDeactivatedProduct: Product = {
  id: 'product-123',
  userId: 'user-456',
  name: 'Jabón de manos',
  salePrice: '5.50',
  barcode: null,
  unitCostAvg: '3.00',
  minStock: 10,
  categoryId: 'cat-789',
  createdAt: new Date('2025-01-01'),
  isActive: false,
};

describe('ProductService', () => {
  it('it should throw NotFoundError if product does not exist', async () => {
    vi.mocked(mockProductRepo.findById).mockResolvedValue(null)
    const service = new ProductService(mockProductRepo)
    await expect(service.deactivate('false-id')).rejects.toThrow(NotFoundError)
  })
})

describe('ProductService.listAll', () => {
  it('')
})

describe('ProductService.deactivate', () => {
  it('it should deactivate the product', async () => {
    vi.mocked(mockProductRepo.findById).mockResolvedValue(fakeProductWithStock)
    vi.mocked(mockProductRepo.deactivate).mockResolvedValue(fakeDeactivatedProduct)

    const service = new ProductService(mockProductRepo)
    await service.deactivate(fakeProductWithStock.id)

    expect(mockProductRepo.deactivate).toHaveBeenCalledWith(fakeProductWithStock.id)
    expect(mockProductRepo.deactivate).toHaveBeenCalledTimes(1)
  })
})

describe('ProductService.update', () => {
  it('it should update the product correctly', async () => {
    vi.mocked(mockProductRepo.findById).mockResolvedValue(fakeProductWithStock)
    vi.mocked(mockProductRepo.update).mockResolvedValue(fakeDeactivatedProduct)

    const service = new ProductService(mockProductRepo)
    const updatedProduct = await service.update(fakeDeactivatedProduct)
    expect(updatedProduct).toEqual(fakeDeactivatedProduct)
  })
})