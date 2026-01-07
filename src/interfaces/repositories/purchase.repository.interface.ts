import type { PoolClient } from 'pg';
import type { Purchase, PurchaseInsert } from '../../models/purchase.model.js';
import type { PurchaseItem, PurchaseItemInsert } from '../../models/purchase-item.model.js';

export interface IPurchaseRepository {
  create(userId: string, purchaseBasicData: PurchaseInsert, client: PoolClient): Promise<Purchase>;
  listAllPurchases(userId: string): Promise<any[]>;
  createPurchaseItems(
    purchaseId: string,
    purchaseItems: PurchaseItemInsert[],
    client: PoolClient
  ): Promise<PurchaseItem[]>;
}

