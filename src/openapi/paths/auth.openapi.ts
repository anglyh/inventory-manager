import {
  authResponseSchema,
  authStatusResponseSchema,
  createUserSchema,
  loginSchema,
} from '../../schemas/user.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { bearerAuth, registry } from '../registry.js';
import { errorRef } from '../responses.js';

const basePath = '/api/auth';

export const userTag = {
  name: 'Users',
  description: 'Endpoints para gestión de usuarios y autenticación',
};

const tags = [userTag.name];

// Errors returned by every authentication operation.
const commonErrors = {
  400: errorRef('BadRequest'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'post',
  path: `${basePath}/register`,
  summary: 'Registrar un nuevo usuario',
  tags,
  security: [],
  request: { body: jsonBody(createUserSchema) },
  responses: {
    201: jsonResponse('Usuario creado; retorna token y usuario.', authResponseSchema),
    ...commonErrors,
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/login`,
  summary: 'Autenticar usuario y obtener token JWT',
  tags,
  security: [],
  request: { body: jsonBody(loginSchema) },
  responses: {
    200: jsonResponse('Autenticación exitosa; retorna token y usuario.', authResponseSchema),
    ...commonErrors,
    401: errorRef('Unauthorized'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/check-status`,
  summary: 'Verificar el estado de autenticación del usuario actual',
  tags,
  security: bearerAuth,
  responses: {
    200: jsonResponse('Token actual y sus datos de usuario autenticado.', authStatusResponseSchema),
    ...commonErrors,
    401: errorRef('Unauthorized'),
  },
});
