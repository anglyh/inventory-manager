import { Router } from 'express';
import UserController from '../controllers/user.controller.js';
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createStoreUserSchema, storeUserIdSchema, updateStoreUserSchema } from '../schemas/user.schema.js';

// ADMIN-only: requireAdmin is applied where the router is mounted (src/index.ts).
const router = Router();
router.get('/', UserController.listStoreUsers);
router.post('/', validateBody(createStoreUserSchema), UserController.createStoreUser);
router.patch('/:id', validateParams(storeUserIdSchema), validateBody(updateStoreUserSchema), UserController.setStoreUserActive);
export default router;
