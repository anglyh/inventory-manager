import { withTransaction } from '../db/transactions.js';
import type { SaleItemInsert } from '../models/sale-item.model.js';
import type { SaleDetailResponse } from '../models/sale.model.js';
import ProductRepository from '../repositories/product.repository.js';
import SaleRepository from '../repositories/sale.repository.js';
import type { CreateSaleDTO } from '../schemas/sale.schema.js';
// import { validateProductStock } from '../utils/sale.utils.js';

export default class SaleService {
  static async registerSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse> {
    return withTransaction(async (client) => {
      let totalAmount = 0;
      const itemsToInsert: SaleItemInsert[] = [];

      for (const item of saleData.items) {
        const product = await ProductRepository.findById(item.productId, client)
        totalAmount += Number(product.salePrice) * item.quantity

        itemsToInsert.push({
          productId: product.id,
          quantity: item.quantity,
          salePrice: product.salePrice,
        })
      }

      const sale = await SaleRepository.createSale(userId, client)
      const items = await SaleRepository.createSaleItems(
        sale.id,
        itemsToInsert,
        client
      )

      const saleDetail: SaleDetailResponse = {
        id: sale.id,
        totalAmount,
        createdAt: sale.createdAt,
        items
      }
      return saleDetail;
    })
  }

  static async listAllSales(userId: string): Promise<SaleDetailResponse[]> {
    const sales = await SaleRepository.listAllSales(userId);
    return sales;
  }
}