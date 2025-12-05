import express from "express"
import UserController from '../controllers/user.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createUserSchema, loginSchema } from '../schemas/user.schema.js';

const userRouter = express.Router();

userRouter.post("/register", validateBody(createUserSchema), UserController.signUp)
userRouter.post("/login", validateBody(loginSchema), UserController.login)

export default userRouter;