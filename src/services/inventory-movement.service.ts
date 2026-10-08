import type { PoolClient } from 'pg';
import { withTransaction } from '../db/transactions.js';
import { BadRequestError, ConflictError, NotFoundError } from '../errors/app.error.js';
import type { IInventoryMovementRepository } from '../interfaces/repositories/inventory-movement.repository.interface.js';
import type { IProductRepository } from '../interfaces/repositories/product.repository.interface.js';
import type { ICashRegisterRepository } from '../interfaces/repositories/cash-register.repository.interface.js';
import type { ISupplierRepository } from '../interfaces/repositories/supplier.repository.interface.js';
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
  type MovementItemDTO,
  type InitialLoadDTO, type AdjustmentDTO,
  type SaleDTO, type PurchaseDTO, type LossDTO,
  type StockCountDTO,
} from '../schemas/inventory-movement.schema.js';
import { calculateUnitCostAverage } from '../utils/calculations.js';
import { buildCursorPage } from '../utils/cursor-pagination.js';

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
    private productRepo: IProductRepository,
    private cashRegisterRepo: ICashRegisterRepository,
    private supplierRepo: ISupplierRepository,
  ) {}

  async registerSale(storeId: string, sale: SaleDTO, userId?: string): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, {
      ...sale,
      reason: 'SALE',
      items: sale.items.map(({ salePrice, ...item }) => ({ ...item, unitPrice: salePrice })),
    }, 'OUT', userId);
  }

  async registerPurchase(storeId: string, purchase: PurchaseDTO, userId?: string): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, {
      ...purchase,
      reason: 'PURCHASE',
      items: purchase.items.map(({ unitCost, ...item }) => ({ ...item, unitPrice: unitCost })),
    }, 'IN', userId);
  }

  async registerLoss(storeId: string, data: LossDTO, userId?: string): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, data, 'OUT', userId);
  }

  async registerInitialLoad(storeId: string, data: InitialLoadDTO, userId?: string): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, { ...data, reason: 'INITIAL_LOAD' }, 'IN', userId);
  }

  async registerAdjustment(storeId: string, data: AdjustmentDTO, userId?: string): Promise<RegisterInventoryMovementResult> {
    return this.registerMovement(storeId, data, data.movementType, userId);
  }

  private async registerMovement(
    storeId: string,
    body: RegisterMovementInput,
    movementType: MovementType,
    userId?: string,
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
      createdBy: userId ?? null,
    };

    return withTransaction(async client => {
      if (supplierId && !await this.supplierRepo.findById(storeId, supplierId, client)) {
        throw new NotFoundError('El proveedor no existe');
      }
      // Siempre bloquear la caja antes que los productos; el cierre usa el mismo lock.
      if (reason === 'SALE') {
        data.cashRegisterId = await this.cashRegisterRepo.lockOpen(storeId, cashRegisterId, client);
      }
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
    if (filters.productId && !await this.productRepo.findForStore(filters.storeId, filters.productId)) {
      throw new NotFoundError('El producto no existe');
    }
    if (filters.cashRegisterId && !await this.cashRegisterRepo.findById(filters.storeId, filters.cashRegisterId)) {
      throw new NotFoundError('La caja no existe');
    }
    const movements = await this.inventoryMovementRepo.listMovementsByCursor(filters);

    return buildCursorPage(movements, filters.limit, movement => movement.createdAt);
  }

  async getById(storeId: string, id: string) {
    const [movement] = await this.inventoryMovementRepo.listMovementsByCursor({ storeId, id, limit: 1 });
    if (!movement) throw new NotFoundError('El movimiento no existe');
    return movement;
  }

  async registerStockCount(storeId: string, userId: string, data: StockCountDTO): Promise<void> {
    await withTransaction(async client => {
      const increases: MovementItemDTO[] = [];
      const decreases: MovementItemDTO[] = [];

      // Bloquear todos los productos antes de calcular diferencias con el stock real.
      const orderedItems = [...data.items].sort((a, b) => a.productId.localeCompare(b.productId));
      for (const item of orderedItems) {
        const product = await this.productRepo.findByIdForUpdate(item.productId, client);
        if (product.storeId !== storeId) throw new NotFoundError('El producto no existe');
        if (!product.isActive) throw new ConflictError(`El producto "${product.name}" está desactivado`);
        const stock = await this.productRepo.getStock(item.productId, client);
        const difference = item.countedQuantity - stock;
        if (difference === 0) continue;
        const target = difference > 0 ? increases : decreases;
        target.push({ productId: item.productId, quantity: Math.abs(difference), unitPrice: Number(product.unitCostAvg ?? 0) });
      }

      if (!increases.length && !decreases.length) throw new ConflictError('El conteo coincide con el stock; no hay ajustes que registrar');
      for (const [items, reason, movementType] of [
        [increases, 'COUNT_SURPLUS', 'IN'],
        [decreases, 'COUNT_SHORTAGE', 'OUT'],
      ] as const) {
        if (!items.length) continue;
        const { itemsToInsert } = await this.processItems(items, movementType, reason, storeId, client);
        const movement = await this.inventoryMovementRepo.create({
          storeId, movementType, reason, createdBy: userId,
          cashRegisterId: null, supplierId: null, paymentMethod: null, notes: data.notes,
        }, client);
        await this.inventoryMovementRepo.createMovementItems(movement.id, itemsToInsert, client);
      }
    });
  }

  async voidMovement(storeId: string, userId: string, id: string, { reason }: { reason: string }): Promise<void> {
    await withTransaction(async client => {
      const movement = await this.inventoryMovementRepo.getForVoid(storeId, id, client);
      if (!movement) throw new NotFoundError('El movimiento no existe');

      // Mismo orden que una venta: caja, productos ordenados y finalmente movimiento.
      if (movement.reason === 'SALE') {
        if (!movement.cashRegisterId) throw new ConflictError('La venta no tiene una caja asociada');
        await this.cashRegisterRepo.lockOpen(storeId, movement.cashRegisterId, client);
      }
      const items = await this.inventoryMovementRepo.getVoidItems(id, client);
      for (const item of items) {
        const product = await this.productRepo.findByIdForUpdate(item.productId, client);
        if (product.storeId !== storeId) throw new NotFoundError('El producto no existe');
      }
      const current = await this.inventoryMovementRepo.getForVoid(storeId, id, client, true);
      if (current?.status !== 'COMPLETED') throw new ConflictError('El movimiento ya está anulado');

      for (const item of items) {
        if (await this.inventoryMovementRepo.hasLaterMovement(id, item.productId, client)) {
          throw new ConflictError('Hay movimientos posteriores de estos productos; no se puede anular este movimiento');
        }
        if (movement.movementType === 'IN' && await this.productRepo.getStock(item.productId, client) < item.quantity) {
          throw new ConflictError('La anulación dejaría stock negativo');
        }
        if (movement.reason === 'PURCHASE' || movement.reason === 'INITIAL_LOAD') {
          if (item.unitCostBefore === null) throw new ConflictError('No se conservó el costo anterior de esta entrada; no se puede anular');
          await this.productRepo.updateUnitCostAvg(item.productId, Number(item.unitCostBefore), client);
        }
      }
      if (movement.reason === 'SALE' && movement.paymentMethod === 'CASH' && !await this.inventoryMovementRepo.canReverseCashSale(id, client)) {
        throw new ConflictError('Efectivo insuficiente para revertir esta venta');
      }
      await this.inventoryMovementRepo.void(storeId, id, userId, reason, client);
    });
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

      if (reason === 'INITIAL_LOAD' && await this.inventoryMovementRepo.hasProductMovements(productId, client)) {
        throw new ConflictError(`"${product.name}" ya tiene movimientos; utilice una compra o un ajuste`);
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
        ...((reason === 'PURCHASE' || reason === 'INITIAL_LOAD')
          ? { unitCostBefore: costAvgSnapshotByProductId.get(item.productId) ?? 0 }
          : {}),
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
