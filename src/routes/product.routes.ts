import express, { Router } from "express"
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createProductSchema, updateProductSchema, productIdParamSchema } from '../schemas/product.schema.js';
import ProductController from '../controllers/product.controller.js';

const productRouter: Router = express.Router();

productRouter.post("/", validateBody(createProductSchema), ProductController.createProduct)
productRouter.get("/", ProductController.listAllProducts)
productRouter.put("/:id", validateParams(productIdParamSchema), validateBody(updateProductSchema), ProductController.updateProduct)
productRouter.delete("/:id", validateParams(productIdParamSchema), ProductController.delete)

export default productRouter;