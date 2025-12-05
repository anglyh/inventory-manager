import { withTransaction } from '../db/transactions.js';
import type { SaleItemInsert } from '../models/sale-item.model.js';
import type { SaleDetailResponse } from '../models/sale.model.js';
import ProductRepository from '../repositories/product.repository.js';
import SaleRepository from '../repositories/sale.repository.js';
import type { CreateSaleDTO } from '../schemas/sale.schema.js';
import { validateProductStock } from '../utils/sale.utils.js';

export default class SaleService {
  static async createSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse> {
    return withTransaction(async (client) => {
      let totalAmount = 0;
      let totalProfit = 0;
      let totalUnitCost = 0;

      const itemsToInsert: SaleItemInsert[] = [];

      for (const item of saleData.items) {
        const product = await ProductRepository.findById(item.productId, client)

        totalAmount += product.salePrice * item.quantity
        totalUnitCost += product.unitCost * item.quantity

        validateProductStock(product, item.quantity)

        product.stock -= item.quantity
        await ProductRepository.update(product, client);

        itemsToInsert.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          salePrice: product.salePrice,
          unitCost: product.unitCost
        })
      }
      totalProfit = totalAmount - totalUnitCost

      const sale = await SaleRepository.createSale(userId, { totalAmount, totalProfit }, client)
      const items = await SaleRepository.createSaleItems(
        sale.id,
        itemsToInsert,
        client
      )

      const saleDetail: SaleDetailResponse = {
        id: sale.id,
        userId: sale.userId,
        totalAmount: sale.totalAmount,
        totalProfit: sale.totalProfit,
        createdAt: sale.createdAt,
        items
      }
      return saleDetail;
    })
  }
}