import express, { Router } from "express";
import SaleController from '../controllers/sale.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createSaleSchema } from '../schemas/sale.schema.js';

const saleRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Endpoints para registro y consulta de ventas
 */

/**
 * @swagger
 * /api/sale:
 *   post:
 *     summary: Registrar una nueva venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *               - items
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [EFECTIVO, YAPE, PLIN, TRANSFERENCIA]
 *                 example: EFECTIVO
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 3
 *     responses:
 *       201:
 *         description: Venta registrada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 */
saleRouter.post("/", validateBody(createSaleSchema), SaleController.createSale)

/**
 * @swagger
 * /api/sale:
 *   get:
 *     summary: Obtener el historial de ventas (paginado)
 *     tags: [Sales]
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
 *         description: Cantidad de ventas por página
 *     responses:
 *       200:
 *         description: Lista paginada de ventas
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
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       totalAmount:
 *                         type: string
 *                         example: "75.00"
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
 *                             salePrice:
 *                               type: string
 *                               example: "25.00"
 *                             unitCost:
 *                               type: string
 *                               example: "15.00"
 *                             quantity:
 *                               type: integer
 *                               example: 3
 *                 totalItems:
 *                   type: integer
 *                   example: 30
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: No autorizado
 */
saleRouter.get("/", SaleController.listAllSales)

export default saleRouter;