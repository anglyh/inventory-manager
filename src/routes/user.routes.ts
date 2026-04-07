import express from "express";
import UserController from '../controllers/user.controller.js';
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
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
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "secret123"
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT de acceso
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Datos inválidos
 */
userRouter.post("/register", validateBody(createUserSchema), UserController.signUp)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticar usuario y obtener token JWT
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 minLength: 1
 *                 example: "secret123"
 *     responses:
 *       200:
 *         description: Autenticación exitosa, retorna el JWT y datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT de acceso
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Credenciales incorrectas
 */

userRouter.post("/login", validateBody(loginSchema), UserController.login)

/**
 * @swagger
 * /api/auth/check-status:
 *   get:
 *     summary: Verificar el estado de autenticación del usuario actual
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido, retorna los datos del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: No autorizado o token inválido
 */
userRouter.get("/check-status", requireAuth, UserController.checkStatus)

export default userRouter;