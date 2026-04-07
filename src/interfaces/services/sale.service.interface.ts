import type { SaleDetailResponse } from '../../models/sale.model.js';
import type { CreateSaleDTO } from '../../schemas/sale.schema.js';
import type { PaginatedResult } from '../../types/api.types.js';

export interface ISaleService {
  registerSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse>;
  listAllSales(userId: string, page: number, limit: number): Promise<PaginatedResult<SaleDetailResponse>>;
}

