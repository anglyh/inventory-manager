import express, { Router } from "express";
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createCategorySchema } from '../schemas/category.schema.js';
import CategoryController from '../controllers/category.controller.js';

const categoryRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Endpoints para gestión de categorías
 */

/**
 * @swagger
 * /api/category:
 *   post:
 *     summary: Crear una nueva categoría
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Categoría creada
 */
categoryRouter.post("/", validateBody(createCategorySchema), CategoryController.createCategory)

/**
 * @swagger
 * /api/category:
 *   get:
 *     summary: Listar todas las categorías
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Retorna un listado de categorías
 */
categoryRouter.get("/", CategoryController.listCategories)

export default categoryRouter;