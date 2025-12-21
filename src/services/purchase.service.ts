import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import type { PurchaseItemInsert, PurchaseItemDetail } from '../models/purchase-item.model.js';
import type { PurchaseDetailResponse } from '../models/purchase.model.js';
import ProductRepository from '../repositories/product.repository.js';
import PurchaseRepository from '../repositories/purchase.repository.js';
import type { CreatePurchaseDTO } from '../schemas/purchase.schema.js';
import type { Product } from '../models/product.model.js';

export default class PurchaseService {
  static async registerPurchase(userId: string, purchaseData: CreatePurchaseDTO): Promise<PurchaseDetailResponse> {
    return withTransaction(async client => {
      const { items, notes, supplierName } = purchaseData;
      const { itemsToInsert, totalAmount } = await this.processItems(items, client)

      const purchase = await PurchaseRepository.create(userId, { supplierName, notes }, client)
      const purchaseItems = await PurchaseRepository.createPurchaseItems(purchase.id, itemsToInsert, client)

      const purchaseDetail: PurchaseDetailResponse = {
        id: purchase.id,
        notes: purchase.notes,
        supplierName: purchase.supplierName,
        createdAt: purchase.createdAt,
        totalCost: totalAmount,
        items: purchaseItems
      }

      return purchaseDetail;
    })
  }

  static async listAllPurchases(userId: string) {
    const purchases = await PurchaseRepository.listAllPurchases(userId);
    return purchases
  }

  private static async processItems(
    items: CreatePurchaseDTO["items"],
    client: PoolClient
  ): Promise<{ itemsToInsert: PurchaseItemInsert[]; totalAmount: number }> {
    const itemsToInsert: PurchaseItemInsert[] = [];
    let totalAmount = 0

    for (const item of items) {
      const product = await ProductRepository.findByIdForUpdate(item.productId, client);

      await this.updateProductCost(product, item, client)
      totalAmount = item.unitCost * item.quantity;
      itemsToInsert.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitCost: item.unitCost.toString()
      })
    }

    return { itemsToInsert, totalAmount }
  }

  private static async updateProductCost(
    product: Product,
    item: CreatePurchaseDTO["items"][0],
    client: PoolClient
  ): Promise<void> {
    const currentStock = await ProductRepository.getStock(item.productId, client);
    const currentAvg = parseFloat(product.unitCostAvg) || 0;
    const newAvg = this.calculateUnitCostAverage(currentStock, currentAvg, item)
    await ProductRepository.updateUnitCostAvg(item.productId, Math.round(newAvg * 100) / 100, client);
  }

  private static calculateUnitCostAverage(
    currentStock: number,
    currentAvg: number,
    item: CreatePurchaseDTO["items"][0]
  ): number {
    if (currentStock === 0 && currentAvg === 0) {
      return item.unitCost;
    }
    return (currentStock * currentAvg + item.quantity * item.unitCost) / (currentStock + item.quantity);
  }
}