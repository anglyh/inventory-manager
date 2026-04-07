import type { PoolClient } from 'pg';
import type { Purchase, PurchaseInsert, PurchaseDetailResponse } from '../../models/purchase.model.js';
import type { PurchaseItem, PurchaseItemInsert } from '../../models/purchase-item.model.js';
import type { PaginatedData } from '../../types/api.types.js';
import type { ListPurchaseFilters } from '../../types/purchase.types.js';

export interface IPurchaseRepository {
  create(userId: string, purchaseBasicData: PurchaseInsert, client: PoolClient): Promise<Purchase>;
  listAllPurchases(filters: ListPurchaseFilters): Promise<PaginatedData<PurchaseDetailResponse>>;
  createPurchaseItems(
    purchaseId: string,
    purchaseItems: PurchaseItemInsert[],
    client: PoolClient
  ): Promise<PurchaseItem[]>;
}

