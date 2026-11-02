import express from "express";
import UserController from '../controllers/user.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rate-limit.middleware.js';
import { createUserSchema, loginSchema } from '../schemas/user.schema.js';

const userRouter = express.Router();

userRouter.post("/register", authLimiter, validateBody(createUserSchema), UserController.signUp)

userRouter.post("/login", authLimiter, validateBody(loginSchema), UserController.login)

userRouter.get("/check-status", requireAuth, UserController.checkStatus)

export default userRouter;