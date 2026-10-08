import express, { Router } from "express"
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createProductSchema, updateProductSchema, productIdParamSchema } from '../schemas/product.schema.js';
import ProductController from '../controllers/product.controller.js';

const productRouter: Router = express.Router();

productRouter.post("/", validateBody(createProductSchema), ProductController.createProduct)

productRouter.get("/", ProductController.listAllProducts)

productRouter.get("/options", ProductController.listProductOptions)

productRouter.put("/:id", validateParams(productIdParamSchema), validateBody(updateProductSchema), ProductController.updateProduct)

productRouter.delete("/:id", validateParams(productIdParamSchema), ProductController.delete)

productRouter.get("/search/by-name", ProductController.getByName)

productRouter.get('/:id', validateParams(productIdParamSchema), ProductController.getById);

export default productRouter;
