import express, { Router } from 'express';
import ReportController from '../controllers/report.controller.js';

const reportRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reportes de ganancias basados en movimientos OUT (ventas)
 */

/**
 * @swagger
 * /api/report/profit/summary:
 *   get:
 *     summary: Resumen de ganancias del periodo
 *     description: |
 *       Totales del rango: ingresos, COGS, ganancia, margen %, # ventas y ticket promedio.
 *       Si no se envían `from` y `to`, se asumen los últimos 30 días.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Totales del periodo
 *       400:
 *         description: Query inválida (por ejemplo from >= to)
 *       401:
 *         description: No autorizado
 */
reportRouter.get('/profit/summary', ReportController.getProfitSummary);

/**
 * @swagger
 * /api/report/profit/by-product:
 *   get:
 *     summary: Top productos por ganancia
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *     responses:
 *       200:
 *         description: Ranking de productos
 *       400:
 *         description: Query inválida
 *       401:
 *         description: No autorizado
 */
reportRouter.get('/profit/by-product', ReportController.getProfitByProduct);

export default reportRouter;

