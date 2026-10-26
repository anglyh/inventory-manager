import { Router } from 'express';
import StayController from '../controllers/stay.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zod-validation.middleware.js';
import {
  checkInSchema,
  checkOutSchema,
  stayChargeSchema,
  stayIdSchema,
  stayListQuerySchema,
  stayMigrationsSchema,
  stayPaymentSchema,
} from '../schemas/stay.schema.js';

// Staff (GUEST) operates the front desk: every stay route only requires authentication.
const router = Router();

router.get('/', validateQuery(stayListQuerySchema), StayController.list);
router.post('/', validateBody(checkInSchema), StayController.checkIn);
router.get('/:id', validateParams(stayIdSchema), StayController.getById);
router.post('/:id/charge', validateParams(stayIdSchema), validateBody(stayChargeSchema), StayController.addCharge);
router.post('/:id/payment', validateParams(stayIdSchema), validateBody(stayPaymentSchema), StayController.addPayment);
router.post('/:id/check-out', validateParams(stayIdSchema), validateBody(checkOutSchema), StayController.checkOut);
router.patch('/:id/migrations', validateParams(stayIdSchema), validateBody(stayMigrationsSchema), StayController.setMigrationsReported);

export default router;
