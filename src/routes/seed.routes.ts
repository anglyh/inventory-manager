import express, { Router } from "express";
import SeedController from '../controllers/seed.controller.js';

const seedRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Seed
 *   description: Endpoints para inicializar la base de datos con datos de prueba
 */

/**
 * @swagger
 * /api/seed:
 *   post:
 *     security: []
 *     summary: Inicializar base de datos con usuario, categorías y productos por defecto
 *     tags: [Seed]
 *     responses:
 *       201:
 *         description: Datos de prueba creados; incluye conteos y si el usuario fue creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeedResult'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
seedRouter.post("/", SeedController.runSeed)

export default seedRouter;
