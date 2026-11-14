import {
  authResponseSchema,
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

// The refresh token lives only in this HttpOnly cookie, scoped to /api/auth.
registry.registerComponent('securitySchemes', 'refreshCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: 'refreshToken',
  description: 'Refresh token opaco en una cookie HttpOnly, SameSite=Strict, con path /api/auth. La fijan login, register y refresh; el navegador la envía sola.',
});
const refreshCookie = [{ refreshCookie: [] }];

const setsSessionCookie = {
  'Set-Cookie': {
    description: 'Cookie HttpOnly `refreshToken` con el refresh token nuevo (vence a los 7 días, nunca después del límite de 30 días de la sesión).',
    schema: { type: 'string' as const },
  },
};

const clearsSessionCookie = {
  'Set-Cookie': {
    description: 'Borra la cookie `refreshToken`.',
    schema: { type: 'string' as const },
  },
};

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
    201: {
      ...jsonResponse('Usuario creado; retorna access token y usuario, y abre la sesión con la cookie del refresh token.', authResponseSchema),
      headers: setsSessionCookie,
    },
    ...commonErrors,
    403: errorRef('Forbidden'),
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/login`,
  summary: 'Autenticar usuario y obtener access token JWT',
  tags,
  security: [],
  request: { body: jsonBody(loginSchema) },
  responses: {
    200: {
      ...jsonResponse('Autenticación exitosa; retorna access token y usuario, y abre la sesión con la cookie del refresh token.', authResponseSchema),
      headers: setsSessionCookie,
    },
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
    200: jsonResponse('Sesión vigente; retorna el access token enviado y el usuario.', authResponseSchema),
    ...commonErrors,
    401: errorRef('Unauthorized'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/refresh`,
  summary: 'Renovar el access token con la cookie del refresh token',
  description: 'Rota el refresh token de la cookie: lo marca como usado, fija uno nuevo y devuelve un access token. '
    + 'Si la sesión no existe, venció, se cerró, el usuario está desactivado o se reutiliza un token ya rotado, responde 401 y borra la cookie; '
    + 'el reuso además cierra la sesión completa. Dos renovaciones simultáneas (varias pestañas) dentro de 10 segundos se aceptan.',
  tags,
  security: refreshCookie,
  responses: {
    200: {
      ...jsonResponse('Sesión renovada; retorna un access token nuevo y el usuario.', authResponseSchema),
      headers: setsSessionCookie,
    },
    401: errorRef('Unauthorized'),
    500: errorRef('InternalError'),
    503: errorRef('DatabaseUnavailable'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/logout`,
  summary: 'Cerrar la sesión actual',
  description: 'Revoca la sesión de la cookie `refreshToken` (todos sus tokens rotados) y borra la cookie. '
    + 'Es idempotente: responde 204 aunque no haya cookie o la sesión ya no exista.',
  tags,
  security: refreshCookie,
  responses: {
    204: { description: 'Sesión cerrada, sin cuerpo.', headers: clearsSessionCookie },
    500: errorRef('InternalError'),
    503: errorRef('DatabaseUnavailable'),
  },
});
