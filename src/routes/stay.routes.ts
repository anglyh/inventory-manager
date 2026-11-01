import { Router } from 'express';
import StayController from '../controllers/stay.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zod-validation.middleware.js';
import {
  checkInSchema,
  checkOutSchema,
  stayChargeSchema,
  stayIdSchema,
  stayListQuerySchema,
  stayMigrationsSchema,
  stayPaymentIdSchema,
  stayPaymentSchema,
  voidStayPaymentSchema,
} from '../schemas/stay.schema.js';

// Staff (GUEST) operates the front desk: stay routes only require authentication, except voiding a
// payment, which is ADMIN-only like voiding a sale.
const router = Router();

router.get('/', validateQuery(stayListQuerySchema), StayController.list);
router.post('/', validateBody(checkInSchema), StayController.checkIn);
router.get('/:id', validateParams(stayIdSchema), StayController.getById);
router.post('/:id/charge', validateParams(stayIdSchema), validateBody(stayChargeSchema), StayController.addCharge);
router.post('/:id/payment', validateParams(stayIdSchema), validateBody(stayPaymentSchema), StayController.addPayment);
router.post(
  '/:id/payment/:paymentId/void',
  requireAdmin,
  validateParams(stayPaymentIdSchema),
  validateBody(voidStayPaymentSchema),
  StayController.voidPayment,
);
router.post('/:id/check-out', validateParams(stayIdSchema), validateBody(checkOutSchema), StayController.checkOut);
router.patch('/:id/migrations', validateParams(stayIdSchema), validateBody(stayMigrationsSchema), StayController.setMigrationsReported);

export default router;
