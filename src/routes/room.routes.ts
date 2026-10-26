import { Router } from 'express';
import RoomController from '../controllers/room.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { createRoomSchema, roomIdSchema, updateRoomSchema } from '../schemas/room.schema.js';

const router = Router();

// Staff (GUEST) routes: the board and marking a room as cleaned. Everything below requireAdmin is ADMIN-only.
router.get('/', RoomController.list);
router.post('/:id/clean', validateParams(roomIdSchema), RoomController.markCleaned);

router.use(requireAdmin);

router.post('/', validateBody(createRoomSchema), RoomController.create);
router.patch('/:id', validateParams(roomIdSchema), validateBody(updateRoomSchema), RoomController.update);
router.delete('/:id', validateParams(roomIdSchema), RoomController.delete);

export default router;
