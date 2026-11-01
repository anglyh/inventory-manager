import { Router } from 'express';
import ExpenseController from '../controllers/expense.controller.js';
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import {
  createExpenseCategorySchema,
  expenseCategoryIdSchema,
  updateExpenseCategorySchema,
} from '../schemas/expense.schema.js';

// Solo ADMIN: el router se monta con requireAdmin en index.ts.
const router = Router();

router.get('/', ExpenseController.listCategories);
router.post('/', validateBody(createExpenseCategorySchema), ExpenseController.createCategory);
router.patch('/:id', validateParams(expenseCategoryIdSchema), validateBody(updateExpenseCategorySchema), ExpenseController.updateCategory);
router.delete('/:id', validateParams(expenseCategoryIdSchema), ExpenseController.deleteCategory);

export default router;
