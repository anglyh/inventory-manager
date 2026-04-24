import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import { ConflictError, NotFoundError } from '../errors/app.error.js';
import type { IInventoryMovementRepository } from '../interfaces/repositories/inventory-movement.repository.interface.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type {
  IInventoryMovementService,
  RegisterInventoryMovementResult,
} from '../interfaces/services/inventory-movement.service.interface.js';
import type { InventoryMovementItemInsert } from '../models/inventory-movement-item.model.js';
import type {
  InventoryMovementInsert,
  InventoryMovementsByCursorParams,
  MovementType,
} from '../models/inventory-movement.model.js';
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

  async listMovementsByCursor(filters: InventoryMovementsByCursorParams) {
    const movements = await this.inventoryMovementRepo.listMovementsByCursor(filters)
    const hasMore = movements.length > filters.limit
    let nextCursor = null
    let movementsResult = movements

    if (hasMore) {
      const lastItem = movements[movements.length - 1]!
      const createdAt =
        lastItem.createdAt instanceof Date
          ? lastItem.createdAt.toISOString()
          : String(lastItem.createdAt)
      nextCursor = {
        cursorDate: createdAt,
        cursorId: lastItem.id,
      }
      movementsResult = movements.slice(0, filters.limit)
    }

    return {
      data: movementsResult,
      nextCursor,
    }
  }

  private async processItems(
    items: InventoryMovementItemInsert[],
    movementType: MovementType,
    userId: string,
    client: PoolClient
  ): Promise<{ itemsToInsert: InventoryMovementItemInsert[]; totalAmount: number }> {
    // Consolidamos por productId: sumamos cantidades y acumulamos el costo total
    // (quantity * unitPrice) para poder calcular un costo unitario ponderado
    // correcto cuando el mismo producto aparece repetido en el payload.
    const aggregatedByProductId = new Map<
      string,
      { quantity: number; totalCost: number }
    >();
    for (const item of items) {
      const current = aggregatedByProductId.get(item.productId) ?? {
        quantity: 0,
        totalCost: 0,
      };
      current.quantity += item.quantity;
      current.totalCost += item.quantity * item.unitPrice;
      aggregatedByProductId.set(item.productId, current);
    }

    // Orden determinístico de los locks para evitar deadlocks entre transacciones
    // concurrentes que tocan los mismos productos en distinto orden.
    const orderedProductIds = [...aggregatedByProductId.keys()].sort();

    let totalAmount = 0;

    for (const productId of orderedProductIds) {
      const aggregated = aggregatedByProductId.get(productId)!;
      const { quantity: totalQuantity, totalCost } = aggregated;

      // Lockeamos el producto dentro de la transacción para serializar salidas
      // concurrentes del mismo producto y evitar stock negativo por carrera.
      const product = await this.productRepo.findByIdForUpdate(productId, client);

      if (product.userId !== userId) {
        throw new NotFoundError('El producto no existe');
      }

      if (!product.isActive) {
        throw new ConflictError(
          `El producto "${product.name}" está desactivado y no admite movimientos`
        );
      }

      if (movementType === 'OUT') {
        const currentStock = await this.productRepo.getStock(productId, client);
        if (currentStock < totalQuantity) {
          throw new ConflictError(`Stock insuficiente para "${product.name}"`);
        }
      }

      if (movementType === 'IN') {
        const weightedUnitCost = totalCost / totalQuantity;
        await this.updateProductCost(
          product,
          { productId, quantity: totalQuantity, unitPrice: weightedUnitCost },
          client
        );
      }

      totalAmount += totalCost;
    }

    // Persistimos los items tal como los envió el cliente (preservamos el detalle
    // para el historial), aunque la validación y el costo promedio se hicieron
    // sobre los totales agregados.
    const itemsToInsert: InventoryMovementItemInsert[] = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

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
