import express, { Router } from "express"
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createProductSchema, updateProductSchema, productIdParamSchema } from '../schemas/product.schema.js';
import ProductController from '../controllers/product.controller.js';

const productRouter: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Endpoints para la gestión de productos
 */

/**
 * @swagger
 * /api/product:
 *   post:
 *     summary: Crear un nuevo producto
 *     tags: [Products]
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
 *               - salePrice
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Agua mineral 500ml
 *               salePrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 99999999.99
 *                 multipleOf: 0.01
 *                 example: 2.5
 *               minStock:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 example: 10
 *               barcode:
 *                 type: string
 *                 maxLength: 50
 *                 example: "7501030300050"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: Producto creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.post("/", validateBody(createProductSchema), ProductController.createProduct)

/**
 * @swagger
 * /api/product:
 *   get:
 *     summary: Obtener todos los productos
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           minimum: 1
 *           maximum: 100
 *         description: Cantidad de productos a devolver por página
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Término opcional para buscar productos por nombre
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtra por nombre de categoría. Acepta uno o varios nombres separados por coma (ej. "Bebidas" o "Bebidas,Snacks"). Comparación insensible a mayúsculas/acentos. Si no se envía, retorna productos de todas las categorías.
 *     responses:
 *       200:
 *         description: Página de productos activos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductsPage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.get("/", ProductController.listAllProducts)

/**
 * @swagger
 * /api/product/options:
 *   get:
 *     summary: Opciones de productos para desplegables
 *     description: Lista todos los productos activos con id, nombre, precio de venta, código de barras, stock y categoría (sin paginación), pensado para selects y formularios de venta u otros flujos.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Opciones de productos activos con precio, código de barras, stock y categoría.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductOption'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.get("/options", ProductController.listProductOptions)

/**
 * @swagger
 * /api/product/{id}:
 *   put:
 *     summary: Actualizar un producto existente
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID del producto a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - salePrice
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Agua mineral 500ml
 *               salePrice:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 99999999.99
 *                 multipleOf: 0.01
 *                 example: 2.5
 *               minStock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 10
 *               barcode:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *                 example: "7501030300050"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Producto actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.put("/:id", validateParams(productIdParamSchema), validateBody(updateProductSchema), ProductController.updateProduct)

/**
 * @swagger
 * /api/product/{id}:
 *   delete:
 *     summary: Desactivar un producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID UUID del producto a eliminar
 *     responses:
 *       204:
 *         description: Producto desactivado. Sin cuerpo de respuesta.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.delete("/:id", validateParams(productIdParamSchema), ProductController.delete)

/**
 * @swagger
 * /api/product/search/by-name:
 *   get:
 *     summary: Buscar productos por nombre
 *     description: Retorna una lista de productos cuyo nombre coincide parcialmente con el término de búsqueda (insensible a mayúsculas y acentos)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         required: false
 *         schema:
 *           type: string
 *         description: Término de búsqueda parcial por nombre de producto
 *         example: "agua"
 *     responses:
 *       200:
 *         description: Productos encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductSearchItem'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
productRouter.get("/search/by-name", ProductController.getByName)

export default productRouter;
