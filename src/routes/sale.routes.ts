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
 *             properties:
 *               productsId:
 *                 type: array
 *                 items:
 *                   type: number
 *     responses:
 *       201:
 *         description: Venta registrada
 */
saleRouter.post("/", validateBody(createSaleSchema), SaleController.createSale)

/**
 * @swagger
 * /api/sale:
 *   get:
 *     summary: Obtener el historial de ventas
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ventas
 */
saleRouter.get("/", SaleController.listAllSales)

export default saleRouter;