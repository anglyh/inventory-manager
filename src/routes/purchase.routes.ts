import express, { Router } from "express";
import PurchaseController from '../controllers/purchase.controller.js';
import { createPurchaseSchema } from '../schemas/purchase.schema.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';

const purchaseRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Purchases
 *   description: Endpoints para registro y consulta de compras
 */

/**
 * @swagger
 * /api/purchase:
 *   post:
 *     summary: Registrar una nueva compra
 *     description: La fecha y hora de la compra (`createdAt`) la asigna el servidor al persistir el registro (no se envía en el cuerpo).
 *     tags: [Purchases]
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
 *               supplierName:
 *                 type: string
 *                 nullable: true
 *                 example: Distribuidora XYZ
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: Pedido urgente
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - unitCost
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     unitCost:
 *                       type: number
 *                       minimum: 0
 *                       example: 1.5
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 24
 *     responses:
 *       201:
 *         description: Compra registrada exitosamente (incluye `createdAt` generado en servidor)
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
purchaseRouter.post("/", validateBody(createPurchaseSchema), PurchaseController.registerPurchase)

/**
 * @swagger
 * /api/purchase:
 *   get:
 *     summary: Obtener historial de compras (paginado)
 *     description: Lista paginada; opcionalmente filtra por rango de fechas si se envían startDate y endDate juntos (ISO 8601).
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Cantidad de compras por página
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           Inicio del rango por fecha de compra (ISO 8601). Solo aplica el filtro si también envías endDate;
 *           si falta uno de los dos, se listan todas las compras (solo paginación).
 *         example: "2024-03-01T00:00:00.000Z"
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           Fin del rango por fecha de compra (ISO 8601). Solo aplica el filtro si también envías startDate.
 *         example: "2024-03-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Lista paginada de compras
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       supplierName:
 *                         type: string
 *                         nullable: true
 *                       notes:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       totalAmount:
 *                         type: number
 *                         example: 150.00
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             productId:
 *                               type: string
 *                               format: uuid
 *                             productName:
 *                               type: string
 *                             unitCost:
 *                               type: string
 *                               example: "5.00"
 *                             quantity:
 *                               type: integer
 *                               example: 10
 *                 totalItems:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: No autorizado
 */
purchaseRouter.get("/", PurchaseController.listAllPurchases)

export default purchaseRouter;