import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app.error.js';
import type { IInventoryMovementRepository } from '../interfaces/repositories/inventory-movement.repository.interface.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type {
  IInventoryMovementService,
  RegisterInventoryMovementResult,
} from '../interfaces/services/inventory-movement.service.interface.js';
import type {
  InventoryMovementInsert,
  InventoryMovementItemInsert,
  InventoryMovementsByCursorParams,
} from '../interfaces/repositories/inventory-movement.repository.interface.js';
import { movementDirections, type MovementType, type MovementReason, type PaymentMethod } from '../models/inventory-movement.model.js';
import type { Product } from '../models/product.model.js';
import {
  saleSchema, purchaseSchema, lossSchema, initialLoadSchema, adjustmentSchema,
  type MovementItemDTO,
  type InitialLoadDTO, type AdjustmentDTO,
  type SaleDTO, type PurchaseDTO, type LossDTO,
} from '../schemas/inventory-movement.schema.js';
import { calculateUnitCostAverage } from '../utils/calculations.js';

// Datos internos: el servicio agrega el motivo a las ventas y compras validadas.
type RegisterMovementInput = {
  reason: MovementReason;
  items: MovementItemDTO[];
  notes?: string | undefined;
  paymentMethod?: PaymentMethod | undefined;
  supplierId?: string | undefined;
  cashRegisterId?: string | undefined;
};

export default class InventoryMovementService implements IInventoryMovementService {
  constructor(
    private inventoryMovementRepo: IInventoryMovementRepository,
    private productRepo: IProductRepository
  ) {}

  async registerSale(storeId: string, body: SaleDTO): Promise<RegisterInventoryMovementResult> {
    const sale = saleSchema.parse(body);
    return this.registerMovement(storeId, {
      ...sale,
      reason: 'SALE',
      items: sale.items.map(({ salePrice, ...item }) => ({ ...item, unitPrice: salePrice })),
    }, 'OUT');
  }

  async registerPurchase(storeId: string, body: PurchaseDTO): Promise<RegisterInventoryMovementResult> {
    const purchase = purchaseSchema.parse(body);
    return this.registerMovement(storeId, {
      ...purchase,
      reason: 'PURCHASE',
      items: purchase.items.map(({ unitCost, ...item }) => ({ ...item, unitPrice: unitCost })),
    }, 'IN');
  }

  async registerLoss(storeId: string, body: LossDTO): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, lossSchema.parse(body), 'OUT');
  }

  async registerInitialLoad(storeId: string, body: InitialLoadDTO): Promise<RegisterInventoryMovementResult> {
    const data = initialLoadSchema.parse(body);
    return this.registerMovement(storeId, { ...data, reason: 'INITIAL_LOAD' }, 'IN');
  }

  async registerAdjustment(storeId: string, body: AdjustmentDTO): Promise<RegisterInventoryMovementResult> {
    const data = adjustmentSchema.parse(body);
    const direction = data.reason === 'MANUAL_CORRECTION'
      ? data.movementType
      : data.reason === 'COUNT_SURPLUS' ? 'IN' : 'OUT';
    return this.registerMovement(storeId, data, direction);
  }

  private async registerMovement(
    storeId: string,
    body: RegisterMovementInput,
    movementType: MovementType
  ): Promise<RegisterInventoryMovementResult> {
    const { notes, items, reason, paymentMethod, supplierId, cashRegisterId } = body;
    if (!movementDirections[reason].includes(movementType)) {
      throw new BadRequestError('El motivo no corresponde a la dirección del movimiento', 'reason');
    }
    const data: InventoryMovementInsert = {
      storeId,
      movementType,
      reason,
      paymentMethod: paymentMethod ?? null,
      supplierId: supplierId ?? null,
      cashRegisterId: cashRegisterId ?? null,
      notes: notes ?? null,
    };

    return withTransaction(async client => {
      const { itemsToInsert, totalAmount } = await this.processItems(
        items,
        movementType,
        reason,
        storeId,
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
        reason: movement.reason,
        status: movement.status,
        notes: movement.notes,
        totalAmount: totalAmount.toFixed(2),
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
      const lastItem = movements[filters.limit - 1]!
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
    items: MovementItemDTO[],
    movementType: MovementType,
    reason: MovementReason,
    storeId: string,
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

    // Guardamos el unitCostAvg vigente por producto para poder usarlo como
    // snapshot en items OUT al final (sin reconsultar la BD).
    const costAvgSnapshotByProductId = new Map<string, number>();

    for (const productId of orderedProductIds) {
      const aggregated = aggregatedByProductId.get(productId)!;
      const { quantity: totalQuantity, totalCost } = aggregated;

      // Lockeamos el producto dentro de la transacción para serializar salidas
      // concurrentes del mismo producto y evitar stock negativo por carrera.
      const product = await this.productRepo.findByIdForUpdate(productId, client);

      if (product.storeId !== storeId) {
        throw new NotFoundError('El producto no existe');
      }

      if (!product.isActive) {
        throw new ConflictError(
          `El producto "${product.name}" está desactivado y no admite movimientos`
        );
      }

      costAvgSnapshotByProductId.set(productId, parseFloat(product.unitCostAvg ?? '0') || 0);

      if (movementType === 'OUT') {
        const currentStock = await this.productRepo.getStock(productId, client);
        if (currentStock < totalQuantity) {
          throw new ConflictError(`Stock insuficiente para "${product.name}"`);
        }
      }

      if (reason === 'PURCHASE' || reason === 'INITIAL_LOAD') {
        const weightedUnitCost = totalCost / totalQuantity;
        await this.updateProductCost(product, totalQuantity, weightedUnitCost, client);
      }

      totalAmount += totalCost;
    }

    // Persistimos los items tal como los envió el cliente (preservamos el detalle
    // para el historial) pero enriquecidos con el unitCost snapshot:
    // Compras/carga inicial usan el costo declarado; otros motivos conservan
    // el costo promedio vigente, sin usar precios de venta como costos.
    const itemsToInsert: InventoryMovementItemInsert[] = items.map(item => {
      const unitCost =
        reason === 'PURCHASE' || reason === 'INITIAL_LOAD'
          ? item.unitPrice
          : costAvgSnapshotByProductId.get(item.productId) ?? 0;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: Math.round(unitCost * 100) / 100,
      };
    });

    return { itemsToInsert, totalAmount };
  }

  private async updateProductCost(
    product: Product,
    newQuantity: number,
    newUnitCost: number,
    client: PoolClient
  ): Promise<void> {
    const currentStock = await this.productRepo.getStock(product.id, client);
    const currentAvg = parseFloat(product.unitCostAvg ?? '0') || 0;

    const newAvg = calculateUnitCostAverage({
      currentStock,
      currentCostAvg: currentAvg,
      newQuantity,
      newUnitCost,
    });

    await this.productRepo.updateUnitCostAvg(
      product.id,
      Math.round(newAvg * 100) / 100,
      client
    );
  }
}
