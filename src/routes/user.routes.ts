import express from "express"
import UserController from '../controllers/user.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createUserSchema, loginSchema } from '../schemas/user.schema.js';

const userRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Endpoints para gestión de usuarios y autenticación
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 */
userRouter.post("/register", validateBody(createUserSchema), UserController.signUp)

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Autenticar usuario y obtener token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Retorna el token JWT
 */
userRouter.post("/login", validateBody(loginSchema), UserController.login)

export default userRouter;