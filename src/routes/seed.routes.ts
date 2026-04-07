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
 *     summary: Inicializar base de datos con usuario, categorías y productos por defecto
 *     tags: [Seed]
 *     responses:
 *       201:
 *         description: Base de datos poblada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                         password:
 *                           type: string
 *                     categoriesCreated:
 *                       type: integer
 *                     productsCreated:
 *                       type: integer
 *       200:
 *         description: El seed ya ha sido aplicado previamente (el usuario ya existe)
 */
seedRouter.post("/", SeedController.runSeed)

export default seedRouter;
