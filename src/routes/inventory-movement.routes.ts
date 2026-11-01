import express, { Router } from 'express';
import InventoryMovementController from '../controllers/inventory-movement.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middlewares/zod-validation.middleware.js';
import { stockCountSchema, inventoryMovementIdSchema, voidMovementSchema } from '../schemas/inventory-movement.schema.js';
import { initialLoadSchema,inventoryMovementsCursorQuerySchema, saleSchema, purchaseSchema, lossSchema } from '../schemas/inventory-movement.schema.js';

// OpenAPI documentation for these routes is generated from Zod in src/openapi/paths/inventory-movement.openapi.ts.
const inventoryMovementRouter: Router = express.Router();

// Staff (GUEST) routes. Everything below requireAdmin is ADMIN-only by default.
inventoryMovementRouter.get('/', validateQuery(inventoryMovementsCursorQuerySchema), InventoryMovementController.listByCursor);
inventoryMovementRouter.get('/:id', validateParams(inventoryMovementIdSchema), InventoryMovementController.getById);
inventoryMovementRouter.post('/sales', validateBody(saleSchema), InventoryMovementController.registerSale);
inventoryMovementRouter.post('/losses', validateBody(lossSchema), InventoryMovementController.registerLoss);

inventoryMovementRouter.use(requireAdmin);

inventoryMovementRouter.post('/purchases', validateBody(purchaseSchema), InventoryMovementController.registerPurchase);
inventoryMovementRouter.post('/stock-counts', validateBody(stockCountSchema), InventoryMovementController.stockCount);
inventoryMovementRouter.post('/initial-loads', validateBody(initialLoadSchema), InventoryMovementController.registerInitialLoad);
inventoryMovementRouter.post('/:id/void', validateParams(inventoryMovementIdSchema), validateBody(voidMovementSchema), InventoryMovementController.voidMovement);

export default inventoryMovementRouter;
