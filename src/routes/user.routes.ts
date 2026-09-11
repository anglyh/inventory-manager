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
 *     security: []
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
 *                 minLength: 12
 *                 pattern: "[A-Z]"
 *                 example: "Secret1234567"
 *     responses:
 *       201:
 *         description: Usuario creado; retorna token y usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
userRouter.post("/register", validateBody(createUserSchema), UserController.signUp)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     security: []
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
 *                 example: "Secret1234567"
 *     responses:
 *       200:
 *         description: Autenticación exitosa; retorna token y usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
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
 *         description: Token actual y sus datos de usuario autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthStatusResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
userRouter.get("/check-status", requireAuth, UserController.checkStatus)

export default userRouter;