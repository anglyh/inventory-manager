import express from "express";
import SaleController from '../controllers/sale.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createSaleSchema } from '../schemas/sale.schema.js';

const saleRouter = express.Router();

saleRouter.post("/", validateBody(createSaleSchema), SaleController.createSale)
//saleRouter.get("/", SaleController.listAllProducts)

export default saleRouter;