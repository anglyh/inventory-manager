import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createUserSchema } from '../schemas/user.schema.js';

const router = Router();
router.get('/', UserController.listStoreUsers);
router.post('/', requireAdmin, validateBody(createUserSchema.strict()), UserController.createStoreUser);
export default router;
