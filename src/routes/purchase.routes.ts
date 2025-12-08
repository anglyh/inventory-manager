import express, { Router } from "express";
import PurchaseController from '../controllers/purchase.controller.js';
import { createPurchaseSchema } from '../schemas/purchase.schema.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';

const purchaseRouter: Router = express.Router();

purchaseRouter.post("/", validateBody(createPurchaseSchema), PurchaseController.registerPurchase)
purchaseRouter.get("/", PurchaseController.listAllPurchases)

export default purchaseRouter;