import { Router } from 'express';
import StoreController from '../controllers/store.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { updateStoreSettingsSchema } from '../schemas/store.schema.js';

const router = Router();

// Staff (GUEST) reads the settings (checkout time, tolerance); only ADMIN changes them.
router.get('/settings', StoreController.getSettings);

router.use(requireAdmin);

router.patch('/settings', validateBody(updateStoreSettingsSchema), StoreController.updateSettings);

export default router;
