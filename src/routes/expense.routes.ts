import { Router } from 'express';
import ExpenseController from '../controllers/expense.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zod-validation.middleware.js';
import { createExpenseSchema, expenseIdSchema, expenseListQuerySchema } from '../schemas/expense.schema.js';

// Solo ADMIN: el router se monta con requireAdmin en index.ts.
const router = Router();

router.get('/', validateQuery(expenseListQuerySchema), ExpenseController.list);
router.post('/', validateBody(createExpenseSchema), ExpenseController.create);
router.delete('/:id', validateParams(expenseIdSchema), ExpenseController.delete);

export default router;
