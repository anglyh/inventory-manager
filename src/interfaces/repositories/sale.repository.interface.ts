import type { PoolClient } from 'pg';
import type { Sale, SaleDetailResponse, PaymentMethod } from '../../models/sale.model.js';
import type { SaleItem, SaleItemInsert } from '../../models/sale-item.model.js';

export interface ISaleRepository {
  createSale(userId: string, method: PaymentMethod, client: PoolClient): Promise<Sale>;
  listAllSales(userId: string): Promise<SaleDetailResponse[]>;
  createSaleItems(
    saleId: string,
    saleItems: SaleItemInsert[],
    client: PoolClient
  ): Promise<SaleItem[]>;
}

