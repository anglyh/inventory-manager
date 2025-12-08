import { withTransaction } from '../db/transactions.js';
import type { PurchaseItemInsert } from '../models/purchase-item.model.js';
import type { PurchaseDetailResponse } from '../models/purchase.model.js';
import ProductRepository from '../repositories/product.repository.js';
import PurchaseRepository from '../repositories/purchase.repository.js';
import type { CreatePurchaseDTO } from '../schemas/purchase.schema.js';

export default class PurchaseService {
  static async registerPurchase(userId: string, purchaseData: CreatePurchaseDTO): Promise<PurchaseDetailResponse> {
    return withTransaction(async client => {

      const itemsToInsert: PurchaseItemInsert[] = [];
      let totalAmount = 0;
      for (const item of purchaseData.items) {
        const product = await ProductRepository.findById(item.productId, client);
        
        totalAmount += product.unitCost * item.quantity;
        product.stock += item.quantity;
        await ProductRepository.update(product, client);
        itemsToInsert.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitCost: product.unitCost
        })
      }

      const { supplierName, notes  } = purchaseData

      const purchase = await PurchaseRepository.create(userId, { notes, supplierName }, client)
      const purchaseItems = await PurchaseRepository.createPurchaseItems(purchase.id, itemsToInsert, client)

      const purchaseDetail: PurchaseDetailResponse = {
        id: purchase.id,
        notes: purchase.notes,
        supplierName: purchase.supplierName,
        createdAt: purchase.createdAt,
        totalAmount,
        items: purchaseItems,
      }

      return purchaseDetail;
    })
  }

  static async listAllPurchases(userId: string) {
    const purchases = await PurchaseRepository.listAllPurchases(userId);
    return purchases
  }
}