import { withTransaction } from '../db/transactions.js';
import { BadRequest } from '../errors/app.error.js';
import type { SaleItemInsert } from '../models/sale-item.model.js';
import type { SaleDetailResponse } from '../models/sale.model.js';
import ProductRepository from '../repositories/product.repository.js';
import SaleRepository from '../repositories/sale.repository.js';
import type { CreateSaleDTO } from '../schemas/sale.schema.js';

export default class SaleService {
  static async registerSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse> {
    return withTransaction(async (client) => {
      const { items, paymentMethod } = saleData
      let totalAmount = 0;
      const itemsToInsert: SaleItemInsert[] = [];

      for (const item of items) {
        const product = await ProductRepository.findById(item.productId, client)
        const stock = await ProductRepository.getStock(item.productId, client)

        if (stock < item.quantity) {
          throw new BadRequest(`Stock insuficiente para "${product.name}"`)
        }

        totalAmount += Number(product.salePrice) * item.quantity

        itemsToInsert.push({
          productId: product.id,
          quantity: item.quantity,
          salePrice: product.salePrice,
          productName: product.name,
          unitCost: product.unitCostAvg
        })
      }

      const sale = await SaleRepository.createSale(userId, paymentMethod, client)
      const saleItems = await SaleRepository.createSaleItems(
        sale.id,
        itemsToInsert,
        client
      )

      const saleDetail: SaleDetailResponse = {
        id: sale.id,
        totalAmount: totalAmount.toString(),
        createdAt: sale.createdAt,
        items: saleItems
      }
      return saleDetail;
    })
  }

  static async listAllSales(userId: string): Promise<SaleDetailResponse[]> {
    const sales = await SaleRepository.listAllSales(userId);
    return sales;
  }
}