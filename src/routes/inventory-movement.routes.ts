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
 *     summary: Historial de entradas (compras), paginado
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Lista paginada de movimientos IN
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.get('/entries', InventoryMovementController.listEntries);

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
 *     summary: Historial de salidas (ventas), paginado
 *     tags: [InventoryMovements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Lista paginada de movimientos OUT
 *       401:
 *         description: No autorizado
 */
inventoryMovementRouter.get('/exits', InventoryMovementController.listExits);

export default inventoryMovementRouter;
