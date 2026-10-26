import { Router } from 'express';
import RoomController from '../controllers/room.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createRoomTypeSchema, roomTypeIdSchema, updateRoomTypeSchema } from '../schemas/room.schema.js';

const router = Router();

// Staff (GUEST) routes. Everything below requireAdmin is ADMIN-only by default.
router.get('/', RoomController.listTypes);

router.use(requireAdmin);

router.post('/', validateBody(createRoomTypeSchema), RoomController.createType);
router.patch('/:id', validateParams(roomTypeIdSchema), validateBody(updateRoomTypeSchema), RoomController.updateType);
router.delete('/:id', validateParams(roomTypeIdSchema), RoomController.deleteType);

export default router;
