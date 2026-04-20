import express, { Router } from 'express';
import InventoryMovementController from '../controllers/inventory-movement.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createInventoryMovementPayloadSchema } from '../schemas/inventory-movement.schema.js';

const inventoryMovementRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: InventoryMovements
 *   description: Movimientos de inventario — entradas (compras) y salidas (ventas)
 */

/**
 * @swagger
 * /api/inventory-movement/entries:
 *   post:
 *     summary: Registrar entrada de inventario (compra)
 *     description: Crea un movimiento tipo IN. Actualiza costo medio del producto cuando aplica. No envíes movementType; lo fija la ruta.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               entityName:
 *                 type: string
 *                 nullable: true
 *                 description: Proveedor u otra referencia (opcional)
 *               notes:
 *                 type: string
 *                 nullable: true
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - unitPrice
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *                       description: Costo unitario de compra
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Entrada registrada (movementType IN)
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.post(
  '/entries',
  validateBody(createInventoryMovementPayloadSchema),
  InventoryMovementController.registerEntry
);

/**
 * @swagger
 * /api/inventory-movement/entries:
 *   get:
 *     summary: Historial de entradas (compras), paginación por cursor
 *     description: |
 *       Orden descendente por fecha de creación e id. La primera petición no envía cursor.
 *       Si la respuesta incluye `nextCursor`, reenvía `cursorDate` y `cursorId` en la siguiente petición (ambos juntos).
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 100
 *         description: Tamaño de página (el servidor puede pedir limit+1 para detectar si hay más)
 *       - in: query
 *         name: cursorDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Valor `nextCursor.cursorDate` de la página anterior (junto con cursorId)
 *       - in: query
 *         name: cursorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Valor `nextCursor.cursorId` de la página anterior (junto con cursorDate)
 *     responses:
 *       200:
 *         description: Página de movimientos IN
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 nextCursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     cursorDate:
 *                       type: string
 *                       format: date-time
 *                     cursorId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Query inválida (p. ej. solo uno de los dos cursores)
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.get('/entries', InventoryMovementController.listEntriesByCursor);

/**
 * @swagger
 * /api/inventory-movement/exits:
 *   post:
 *     summary: Registrar salida de inventario (venta)
 *     description: Crea un movimiento tipo OUT. No envíes movementType; lo fija la ruta.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               entityName:
 *                 type: string
 *                 nullable: true
 *                 description: Cliente u otra referencia (opcional)
 *               notes:
 *                 type: string
 *                 nullable: true
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - unitPrice
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                     unitPrice:
 *                       type: number
 *                       minimum: 0
 *                       description: Precio unitario de venta
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Salida registrada (movementType OUT)
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.post(
  '/exits',
  validateBody(createInventoryMovementPayloadSchema),
  InventoryMovementController.registerExit
);

/**
 * @swagger
 * /api/inventory-movement/exits:
 *   get:
 *     summary: Historial de salidas (ventas), paginación por cursor
 *     description: |
 *       Misma semántica que GET /entries, filtrando movimientos OUT.
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           maximum: 100
 *       - in: query
 *         name: cursorDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: cursorId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Página de movimientos OUT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 nextCursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     cursorDate:
 *                       type: string
 *                       format: date-time
 *                     cursorId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Query inválida
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.get('/exits', InventoryMovementController.listExitsByCursor);

export default inventoryMovementRouter;
