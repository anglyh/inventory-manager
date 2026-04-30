import express, { Router } from "express";
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { categoryIdParamSchema, createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Bebidas
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
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

/**
 * @swagger
 * /api/category/{id}:
 *   put:
 *     summary: Actualizar una categoría existente
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID de la categoría a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: Snacks
 *     responses:
 *       200:
 *         description: Categoría actualizada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Categoría no encontrada
 *       409:
 *         description: Conflicto (por ejemplo, nombre duplicado por usuario)
 */
categoryRouter.put(
  "/:id",
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  CategoryController.updateCategory
);

/**
 * @swagger
 * /api/category/{id}:
 *   delete:
 *     summary: Eliminar una categoría
 *     description: Elimina una categoría del usuario. Los productos que estaban asociados quedan con categoryId = null.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID de la categoría a eliminar
 *     responses:
 *       204:
 *         description: Categoría eliminada exitosamente (sin contenido)
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Categoría no encontrada
 */
categoryRouter.delete(
  "/:id",
  validateParams(categoryIdParamSchema),
  CategoryController.deleteCategory
);

export default categoryRouter;