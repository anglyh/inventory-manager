import type { SaleDetailResponse } from '../../models/sale.model.js';
import type { CreateSaleDTO } from '../../schemas/sale.schema.js';

export interface ISaleService {
  registerSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse>;
  listAllSales(userId: string): Promise<SaleDetailResponse[]>;
}

