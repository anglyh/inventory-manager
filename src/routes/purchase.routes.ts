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
 *     tags: [Purchases]
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
 *         description: Compra registrada exitosamente
 */
purchaseRouter.post("/", validateBody(createPurchaseSchema), PurchaseController.registerPurchase)

/**
 * @swagger
 * /api/purchase:
 *   get:
 *     summary: Obtener historial de compras
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de compras registradas
 */
purchaseRouter.get("/", PurchaseController.listAllPurchases)

export default purchaseRouter;