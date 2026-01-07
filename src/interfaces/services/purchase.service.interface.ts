import type { PurchaseDetailResponse } from '../../models/purchase.model.js';
import type { CreatePurchaseDTO } from '../../schemas/purchase.schema.js';

export interface IPurchaseService {
  registerPurchase(userId: string, purchaseData: CreatePurchaseDTO): Promise<PurchaseDetailResponse>;
  listAllPurchases(userId: string): Promise<any[]>;
}

