import { Router } from 'express';
import CashRegisterController from '../controllers/cash-register.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zod-validation.middleware.js';
import {
  cashMovementHistorySchema, cashMovementSchema, cashRegisterHistorySchema, cashRegisterIdSchema,
  currentCashMovementHistorySchema,
  closeCashRegisterSchema, openCashRegisterSchema,
} from '../schemas/cash-register.schema.js';

const router = Router();

// Staff (GUEST) routes: only the current shift. Everything below requireAdmin is ADMIN-only by default.
router.get('/current', CashRegisterController.current);
router.get('/current/movements', validateQuery(currentCashMovementHistorySchema), CashRegisterController.currentMovements);
router.post('/open', validateBody(openCashRegisterSchema), CashRegisterController.open);
router.post('/:id/movements', validateParams(cashRegisterIdSchema), validateBody(cashMovementSchema), CashRegisterController.addMovement);
router.post('/:id/close', validateParams(cashRegisterIdSchema), validateBody(closeCashRegisterSchema), CashRegisterController.close);

router.use(requireAdmin);

router.get('/', validateQuery(cashRegisterHistorySchema), CashRegisterController.list);
router.get('/:id', validateParams(cashRegisterIdSchema), CashRegisterController.getById);
router.get('/:id/movements', validateParams(cashRegisterIdSchema), validateQuery(cashMovementHistorySchema), CashRegisterController.listMovements);

export default router;
