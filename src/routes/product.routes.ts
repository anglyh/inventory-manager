import express, { Router } from "express"
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createProductSchema, updateProductSchema, productIdParamSchema } from '../schemas/product.schema.js';
import ProductController from '../controllers/product.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const productRouter: Router = express.Router();

// Staff (GUEST) routes. Everything below requireAdmin is ADMIN-only by default.
productRouter.get("/", ProductController.listAllProducts)
productRouter.get("/options", ProductController.listProductOptions)
productRouter.get("/search/by-name", ProductController.getByName)
productRouter.get('/:id', validateParams(productIdParamSchema), ProductController.getById);

productRouter.use(requireAdmin);

productRouter.post("/", validateBody(createProductSchema), ProductController.createProduct)
productRouter.put("/:id", validateParams(productIdParamSchema), validateBody(updateProductSchema), ProductController.updateProduct)
productRouter.delete("/:id", validateParams(productIdParamSchema), ProductController.delete)

export default productRouter;
