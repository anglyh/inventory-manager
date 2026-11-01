import { createStoreUserSchema, storeUserIdSchema, storeUserSchema, updateStoreUserSchema } from '../../schemas/user.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { adminOnly, apiErrorSchema, standardErrors } from '../responses.js';

const basePath = '/api/store-user';
const tags = ['StoreUsers'];

const errors = standardErrors();

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Listar usuarios de la tienda y resolver responsables',
  tags,
  responses: {
    200: jsonResponse('Usuarios de esta tienda, sin contraseñas.', storeUserSchema.array()),
    ...errors,
    ...adminOnly,
  },
});

registry.registerPath({
  method: 'post',
  path: basePath,
  summary: 'Añadir trabajador a la tienda actual',
  description: 'Solo ADMIN. Crea un usuario GUEST en la misma tienda; puede operar caja e inventario. No crea otra tienda ni inicia sesión automáticamente.',
  tags,
  request: { body: jsonBody(createStoreUserSchema) },
  responses: {
    201: jsonResponse('Trabajador creado.', storeUserSchema),
    ...errors,
    403: jsonResponse('Solo administradores.', apiErrorSchema),
  },
});

registry.registerPath({
  method: 'patch',
  path: `${basePath}/{id}`,
  summary: 'Activar o desactivar un empleado',
  description: 'Solo ADMIN y solo usuarios GUEST de la misma tienda. Un empleado desactivado no puede iniciar sesión y su token deja de servir en la siguiente petición.',
  tags,
  request: { params: storeUserIdSchema, body: jsonBody(updateStoreUserSchema) },
  responses: {
    200: jsonResponse('Empleado actualizado.', storeUserSchema),
    ...errors,
    ...adminOnly,
  },
});
