import express, { Router } from "express";
import SaleController from '../controllers/sale.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createSaleSchema } from '../schemas/sale.schema.js';

const saleRouter: Router = express.Router();

saleRouter.post("/", validateBody(createSaleSchema), SaleController.createSale)
saleRouter.get("/", SaleController.listAllSales)

export default saleRouter;