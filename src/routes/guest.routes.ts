import { Router } from 'express';
import StayController from '../controllers/stay.controller.js';
import { validateQuery } from '../middlewares/zod-validation.middleware.js';
import { guestLookupSchema } from '../schemas/stay.schema.js';

// Staff (GUEST) looks up returning guests by document to prefill the check-in.
const router = Router();

router.get('/', validateQuery(guestLookupSchema), StayController.findGuest);

export default router;
