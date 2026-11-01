import { Router } from 'express';
import SupplierController from '../controllers/supplier.controller.js';
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { supplierSchema, supplierIdSchema } from '../schemas/supplier.schema.js';

// ADMIN-only: requireAdmin is applied where the router is mounted (src/index.ts).
const router = Router();
router.get('/', SupplierController.list);
router.post('/', validateBody(supplierSchema), SupplierController.create);
router.put('/:id', validateParams(supplierIdSchema), validateBody(supplierSchema), SupplierController.update);
router.delete('/:id', validateParams(supplierIdSchema), SupplierController.delete);
export default router;
