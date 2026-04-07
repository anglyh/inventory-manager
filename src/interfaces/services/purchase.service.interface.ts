import type { PurchaseDetailResponse } from '../../models/purchase.model.js';
import type { CreatePurchaseDTO } from '../../schemas/purchase.schema.js';
import type { PaginatedResult } from '../../types/api.types.js';
import type { ListPurchaseFilters } from '../../types/purchase.types.js';

export interface IPurchaseService {
  registerPurchase(userId: string, purchaseData: CreatePurchaseDTO): Promise<PurchaseDetailResponse>;
  listAllPurchases(filters: ListPurchaseFilters): Promise<PaginatedResult<PurchaseDetailResponse>>;
}

