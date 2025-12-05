import express from "express"
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createProductSchema } from '../schemas/product.schema.js';
import ProductController from '../controllers/product.controller.js';

const productRouter = express.Router();

productRouter.post("/", validateBody(createProductSchema), ProductController.createProduct)
productRouter.get("/", ProductController.listAllProducts)

export default productRouter;