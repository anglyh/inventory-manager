import { withTransaction } from '../db/transactions.js';
import { BadRequest } from '../errors/app.error.js';
import type { SaleItemInsert } from '../models/sale-item.model.js';
import type { SaleDetailResponse } from '../models/sale.model.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { ISaleRepository } from '../interfaces/repositories/sale.repository.interface.js';
import type { CreateSaleDTO } from '../schemas/sale.schema.js';
import type { ISaleService } from '../interfaces/services/sale.service.interface.js';
import type { PoolClient } from 'pg';

export default class SaleService implements ISaleService {
  constructor(
    private saleRepo: ISaleRepository,
    private productRepo: IProductRepository
  ) { }

  async registerSale(userId: string, saleData: CreateSaleDTO): Promise<SaleDetailResponse> {
    return withTransaction(async (client) => {
      const { items, paymentMethod } = saleData
      const { itemsToInsert, totalAmount } = await this.processItems(items, client);

      const sale = await this.saleRepo.createSale(userId, paymentMethod, client)
      const saleItems = await this.saleRepo.createSaleItems(
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

  async listAllSales(userId: string): Promise<SaleDetailResponse[]> {
    const sales = await this.saleRepo.listAllSales(userId);
    return sales;
  }

  async processItems(
    items: CreateSaleDTO["items"],
    client: PoolClient
  ) {
    let totalAmount = 0;
    const itemsToInsert: SaleItemInsert[] = []

    for (const item of items) {
      const product = await this.productRepo.findById(item.productId, client);
      const stock = await this.productRepo.getStock(item.productId, client);

      if (stock < 1) {
        throw new BadRequest(`Stock insuficiente para "${product.name}"`)
      }

      totalAmount = Number(product.salePrice) * item.quantity;

      itemsToInsert.push({
        productId: product.id,
        quantity: item.quantity,
        salePrice: product.salePrice,
        productName: product.name,
        unitCost: product.unitCostAvg
      })
    }

    return { itemsToInsert, totalAmount }
  }
}