import { createStoreUserSchema, storeUserSchema } from '../../schemas/user.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { apiErrorSchema, standardErrors } from '../responses.js';

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
