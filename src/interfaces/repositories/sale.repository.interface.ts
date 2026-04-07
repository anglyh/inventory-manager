import type { PoolClient } from 'pg';
import type { Sale, SaleDetailResponse, PaymentMethod } from '../../models/sale.model.js';
import type { SaleItem, SaleItemInsert } from '../../models/sale-item.model.js';
import type { PaginatedData } from '../../types/api.types.js';

export interface ISaleRepository {
  createSale(userId: string, method: PaymentMethod, client: PoolClient): Promise<Sale>;
  listAllSales(userId: string, page: number, limit: number): Promise<PaginatedData<SaleDetailResponse>>;
  createSaleItems(
    saleId: string,
    saleItems: SaleItemInsert[],
    client: PoolClient
  ): Promise<SaleItem[]>;
}

