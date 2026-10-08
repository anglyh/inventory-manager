import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createStoreUserSchema } from '../schemas/user.schema.js';

const router = Router();
router.get('/', UserController.listStoreUsers);
router.post('/', requireAdmin, validateBody(createStoreUserSchema), UserController.createStoreUser);
export default router;
