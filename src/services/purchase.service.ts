import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import type { PurchaseItemInsert } from '../models/purchase-item.model.js';
import type { PurchaseDetailResponse } from '../models/purchase.model.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { IPurchaseRepository } from '../interfaces/repositories/purchase.repository.interface.js';
import type { CreatePurchaseDTO } from '../schemas/purchase.schema.js';
import type { Product } from '../models/product.model.js';
import type { IPurchaseService } from '../interfaces/services/purchase.service.interface.js';
import { calculateUnitCostAverage } from '../utils/calculations.js';
import type { PaginatedResult } from '../types/api.types.js';
import type { ListPurchaseFilters } from '../types/purchase.types.js';

export default class PurchaseService implements IPurchaseService {
  constructor(
    private purchaseRepo: IPurchaseRepository,
    private productRepo: IProductRepository
  ) {}

  async registerPurchase(userId: string, purchaseData: CreatePurchaseDTO): Promise<PurchaseDetailResponse> {
    return withTransaction(async client => {
      const { items, notes, supplierName } = purchaseData;
      const { itemsToInsert, totalAmount } = await this.processItems(items, client)

      const purchase = await this.purchaseRepo.create(userId, { supplierName, notes }, client)
      const purchaseItems = await this.purchaseRepo.createPurchaseItems(purchase.id, itemsToInsert, client)

      const purchaseDetail: PurchaseDetailResponse = {
        id: purchase.id,
        createdAt: purchase.createdAt,
        notes: purchase.notes,
        supplierName: purchase.supplierName,
        totalCost: totalAmount,
        items: purchaseItems
      }

      return purchaseDetail;
    })
  }
  
  async listAllPurchases(filters: ListPurchaseFilters): Promise<PaginatedResult<PurchaseDetailResponse>> {
    const { data, totalItems }= await this.purchaseRepo.listAllPurchases(filters);
    const totalPages = Math.ceil(totalItems / filters.limit)

    return {
      data,
      totalItems,
      totalPages,
      currentPage: filters.page,
    }
  }

  private async processItems(
    items: CreatePurchaseDTO["items"],
    client: PoolClient
  ): Promise<{ itemsToInsert: PurchaseItemInsert[]; totalAmount: number }> {
    const itemsToInsert: PurchaseItemInsert[] = [];
    let totalAmount = 0

    for (const item of items) {
      const product = await this.productRepo.findByIdForUpdate(item.productId, client);

      await this.updateProductCost(product, item, client)
      totalAmount += item.unitCost * item.quantity;
      itemsToInsert.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitCost: item.unitCost.toString()
      })
    }

    return { itemsToInsert, totalAmount }
  }

  private async updateProductCost(
    product: Product,
    item: CreatePurchaseDTO["items"][0],
    client: PoolClient
  ): Promise<void> {
    const currentStock = await this.productRepo.getStock(item.productId, client);
    const currentAvg = parseFloat(product.unitCostAvg) || 0;
    
    const { quantity, unitCost } = item
    const newAvg = calculateUnitCostAverage({
      currentStock,
      currentCostAvg: currentAvg,
      newQuantity: quantity,
      newUnitCost: unitCost
    })
    
    await this.productRepo.updateUnitCostAvg(item.productId, Math.round(newAvg * 100) / 100, client);
  }
}