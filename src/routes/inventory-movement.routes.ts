import express, { Router } from 'express';
import InventoryMovementController from '../controllers/inventory-movement.controller.js';
import { validateBody, validateQuery, validateParams } from '../middlewares/zod-validation.middleware.js';
import { stockCountSchema, inventoryMovementIdSchema, voidMovementSchema } from '../schemas/inventory-movement.schema.js';
import { initialLoadSchema, adjustmentSchema, inventoryMovementsCursorQuerySchema, saleSchema, purchaseSchema, lossSchema } from '../schemas/inventory-movement.schema.js';

const inventoryMovementRouter: Router = express.Router();
inventoryMovementRouter.post('/stock-counts', validateBody(stockCountSchema), InventoryMovementController.stockCount);
inventoryMovementRouter.post('/:id/void', validateParams(inventoryMovementIdSchema), validateBody(voidMovementSchema), InventoryMovementController.voidMovement);
inventoryMovementRouter.get('/:id', validateParams(inventoryMovementIdSchema), InventoryMovementController.getById);

/**
 * @swagger
 * components:
 *   schemas:
 *     MovementItems:
 *       type: array
 *       minItems: 1
 *       items:
 *         type: object
 *         required: [productId, unitPrice, quantity]
 *         properties:
 *           productId:
 *             type: string
 *             format: uuid
 *           unitPrice:
 *             type: number
 *             minimum: 0
 *             maximum: 99999999.99
 *             multipleOf: 0.01
 *           quantity:
 *             type: integer
 *             minimum: 1
 *     SaleItems:
 *       type: array
 *       minItems: 1
 *       items:
 *         type: object
 *         additionalProperties: false
 *         required: [productId, salePrice, quantity]
 *         properties:
 *           productId:
 *             type: string
 *             format: uuid
 *           salePrice:
 *             type: number
 *             description: Precio cobrado por unidad en esta venta.
 *             minimum: 0
 *             maximum: 99999999.99
 *             multipleOf: 0.01
 *             example: 3.5
 *           quantity:
 *             type: integer
 *             minimum: 1
 *     PurchaseItems:
 *       type: array
 *       minItems: 1
 *       items:
 *         type: object
 *         additionalProperties: false
 *         required: [productId, unitCost, quantity]
 *         properties:
 *           productId:
 *             type: string
 *             format: uuid
 *           unitCost:
 *             type: number
 *             description: Costo pagado por unidad en esta compra.
 *             minimum: 0
 *             maximum: 99999999.99
 *             multipleOf: 0.01
 *             example: 2
 *           quantity:
 *             type: integer
 *             minimum: 1
 * /api/inventory-movement/sales:
 *   post:
 *     summary: Registrar venta (OUT)
 *     description: El servicio asigna SALE y OUT. Toda venta, incluso por Yape, requiere caja abierta. Si se omite cashRegisterId se utiliza la caja abierta de la tienda. No enviar reason ni movementType.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [paymentMethod, items]
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, YAPE]
 *               cashRegisterId:
 *                 type: string
 *                 format: uuid
 *                 description: Caja abierta de la misma tienda; si se omite, el servidor la selecciona.
 *               notes:
 *                 type: string
 *               items:
 *                 $ref: '#/components/schemas/SaleItems'
 *     responses:
 *       204:
 *         description: Venta registrada. Sin cuerpo de respuesta; consultar el historial para obtener el detalle.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/SaleConflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/inventory-movement/purchases:
 *   post:
 *     summary: Registrar compra (IN)
 *     description: El servicio asigna PURCHASE e IN. No enviar reason ni movementType.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [items]
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               items:
 *                 $ref: '#/components/schemas/PurchaseItems'
 *     responses:
 *       204:
 *         description: Compra registrada. Sin cuerpo de respuesta; consultar el historial para obtener el detalle.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/InventoryEntryConflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/inventory-movement/losses:
 *   post:
 *     summary: Registrar merma o pérdida (OUT)
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [reason, items]
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [LOSS_EXPIRED, LOSS_DAMAGED]
 *               notes:
 *                 type: string
 *               items:
 *                 $ref: '#/components/schemas/MovementItems'
 *     responses:
 *       204:
 *         description: Pérdida registrada. Sin cuerpo de respuesta.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/InventoryExitConflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
inventoryMovementRouter.post('/sales', validateBody(saleSchema), InventoryMovementController.registerSale);
inventoryMovementRouter.post('/purchases', validateBody(purchaseSchema), InventoryMovementController.registerPurchase);
inventoryMovementRouter.post('/losses', validateBody(lossSchema), InventoryMovementController.registerLoss);

/**
 * @swagger
 * /api/inventory-movement:
 *   get:
 *     summary: Historial de movimientos con filtros por dirección y grupo
 *     description: |
 *       Sin filtros devuelve todos los movimientos completados. movementType filtra la dirección y group el grupo; si se envían ambos, se aplican juntos. Una combinación sin coincidencias devuelve data vacío.
 *       group=voids consulta anulados; los demás grupos consultan completados.
 *       Orden descendente por fecha de creación e id. La primera petición no envía cursor.
 *       Para la siguiente página, envía cursorDate y cursorId de nextCursor juntos y conserva los filtros. Al cambiar filtros, reinicia la paginación sin cursor.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cashRegisterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra movimientos vinculados a una caja de esta tienda. Se puede combinar con movementType y group.
 *       - in: query
 *         name: movementType
 *         schema:
 *           type: string
 *           enum: [IN, OUT]
 *         description: IN incluye compras, cargas iniciales y ajustes de entrada. OUT incluye ventas, pérdidas y ajustes de salida. Sin este filtro incluye ambas direcciones.
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *           enum: [sales, purchase, loss, voids]
 *         description: sales incluye SALE; purchase incluye PURCHASE; loss incluye LOSS_EXPIRED, LOSS_DAMAGED y COUNT_SHORTAGE. Sin grupo incluye todos los motivos completados. voids incluye anulados de cualquier motivo.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: cursorDate
 *         description: Valor nextCursor.cursorDate de la página anterior; enviar junto con cursorId.
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: cursorId
 *         description: Valor nextCursor.cursorId de la página anterior; enviar junto con cursorDate.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Historial de movimientos y cursor de la siguiente página (null si no hay más).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryMovementsPage'
 *       404:
 *         $ref: '#/components/responses/CashRegisterNotFound'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
inventoryMovementRouter.get('/', validateQuery(inventoryMovementsCursorQuerySchema), InventoryMovementController.listByCursor);

/**
 * @swagger
 * tags:
 *   name: InventoryMovements
 *   description: Registro e historial de ventas, compras, pérdidas, cargas iniciales y ajustes de inventario
 */

/**
 * @swagger
 * /api/inventory-movement/initial-loads:
 *   post:
 *     summary: Carga inicial (IN)
 *     description: El servicio asigna INITIAL_LOAD e IN. Solo admite productos sin movimientos previos, incluso anulados. unitPrice representa el costo inicial por unidad. No afecta caja.
 *     tags:
 *       - InventoryMovements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - items
 *             properties:
 *               notes:
 *                 type: string
 *               items:
 *                 $ref: '#/components/schemas/MovementItems'
 *     responses:
 *       204:
 *         description: Carga inicial registrada. Sin cuerpo de respuesta.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/InventoryEntryConflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
inventoryMovementRouter.post('/initial-loads', validateBody(initialLoadSchema), InventoryMovementController.registerInitialLoad);

/**
 * @swagger
 * /api/inventory-movement/adjustments:
 *   post:
 *     summary: Ajuste de inventario
 *     description: Corrección manual de un error conocido (MANUAL_CORRECTION). movementType IN agrega stock y OUT lo descuenta. Las cantidades son unidades a agregar o retirar, no el stock final. Las diferencias de conteo físico se registran con /stock-counts.
 *     tags:
 *       - InventoryMovements
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required:
 *               - items
 *               - reason
 *               - movementType
 *             properties:
 *               notes:
 *                 type: string
 *               items:
 *                 $ref: '#/components/schemas/MovementItems'
 *               reason:
 *                 type: string
 *                 enum:
 *                   - MANUAL_CORRECTION
 *               movementType:
 *                 type: string
 *                 enum:
 *                   - IN
 *                   - OUT
 *     responses:
 *       204:
 *         description: Ajuste registrado. Sin cuerpo de respuesta.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/InventoryExitConflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
inventoryMovementRouter.post('/adjustments', validateBody(adjustmentSchema), InventoryMovementController.registerAdjustment);

export default inventoryMovementRouter;
