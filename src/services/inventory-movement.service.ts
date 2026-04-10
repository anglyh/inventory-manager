import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import { NotFoundError } from '../errors/app.error.js';
import type { IInventoryMovementRepository, ListMovementCursorFilters, ListMovementFilters } from '../interfaces/repositories/inventory-movement.repository.interface.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type {
  IInventoryMovementService,
  RegisterInventoryMovementResult,
} from '../interfaces/services/inventory-movement.service.interface.js';
import type { InventoryMovementItemInsert } from '../models/inventory-movement-item.model.js';
import type { InventoryMovementInsert, InventoryMovementListItem, MovementType } from '../models/inventory-movement.model.js';
import type { Product } from '../models/product.model.js';
import type { CreateInventoryMovementPayloadDTO } from '../schemas/inventory-movement.schema.js';
import { calculateUnitCostAverage } from '../utils/calculations.js';

export default class InventoryMovementService implements IInventoryMovementService {
  constructor(
    private inventoryMovementRepo: IInventoryMovementRepository,
    private productRepo: IProductRepository
  ) {}

  async registerEntry(
    userId: string,
    body: CreateInventoryMovementPayloadDTO
  ): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(userId, body, 'IN');
  }

  async registerExit(
    userId: string,
    body: CreateInventoryMovementPayloadDTO
  ): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(userId, body, 'OUT');
  }

  private async registerMovement(
    userId: string,
    body: CreateInventoryMovementPayloadDTO,
    movementType: MovementType
  ): Promise<RegisterInventoryMovementResult> {
    const { entityName, notes, items } = body;
    const data: InventoryMovementInsert = {
      userId,
      movementType,
      entityName: entityName ?? null,
      notes: notes ?? null,
    };

    return withTransaction(async client => {
      const { itemsToInsert, totalAmount } = await this.processItems(
        items,
        movementType,
        userId,
        client
      );

      const movement = await this.inventoryMovementRepo.create(data, client);
      const movementItems = await this.inventoryMovementRepo.createMovementItems(
        movement.id,
        itemsToInsert,
        client
      );

      return {
        id: movement.id,
        movementType: movement.movementType,
        entityName: movement.entityName,
        notes: movement.notes,
        totalAmount,
        items: movementItems,
      };
    });
  }

  async listAll(filters: ListMovementFilters) {
    const { data, totalItems } = await this.inventoryMovementRepo.listAll(filters);
    const totalPages = Math.ceil(totalItems / filters.limit);

    return {
      data,
      totalItems,
      totalPages,
      currentPage: filters.page,
    };
  }

  async list(filters: ListMovementCursorFilters) {
  }

  private async processItems(
    items: InventoryMovementItemInsert[],
    movementType: MovementType,
    userId: string,
    client: PoolClient
  ): Promise<{ itemsToInsert: InventoryMovementItemInsert[]; totalAmount: number }> {
    const itemsToInsert: InventoryMovementItemInsert[] = [];
    let totalAmount = 0;

    for (const item of items) {
      const product =
        movementType === 'IN'
          ? await this.productRepo.findByIdForUpdate(item.productId, client)
          : await this.productRepo.findById(item.productId, client);

      if (!product || product.userId !== userId) {
        throw new NotFoundError('El producto no existe');
      }

      if (movementType === 'IN') {
        await this.updateProductCost(product, item, client);
      }

      totalAmount += item.unitPrice * item.quantity;
      itemsToInsert.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }
    return { itemsToInsert, totalAmount };
  }

  private async updateProductCost(
    product: Product,
    item: InventoryMovementItemInsert,
    client: PoolClient
  ): Promise<void> {
    const currentStock = await this.productRepo.getStock(item.productId, client);
    const currentAvg = parseFloat(product.unitCostAvg) || 0;
    const { quantity, unitPrice: unitCost } = item;

    const newAvg = calculateUnitCostAverage({
      currentStock,
      currentCostAvg: currentAvg,
      newQuantity: quantity,
      newUnitCost: unitCost,
    });

    await this.productRepo.updateUnitCostAvg(
      item.productId,
      Math.round(newAvg * 100) / 100,
      client
    );
  }
}
