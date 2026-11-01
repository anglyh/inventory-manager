import {
  createRoomSchema,
  createRoomTypeSchema,
  roomIdSchema,
  roomResponseSchema,
  roomTypeIdSchema,
  roomTypeResponseSchema,
  updateRoomSchema,
  updateRoomTypeSchema,
} from '../../schemas/room.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { adminOnly, errorRef, standardErrors } from '../responses.js';

export const roomTag = {
  name: 'Rooms',
  description: 'Tipos de habitación, habitaciones y tablero de estados del hostal',
};

const tags = [roomTag.name];
const errors = standardErrors();

// Errors returned by every read-only operation.
const readErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: '/api/room-type',
  summary: 'Listar tipos de habitación',
  description: 'Incluye los desactivados (isActive = false); los activos primero.',
  tags,
  responses: {
    200: jsonResponse('Tipos de habitación con sus tarifas.', roomTypeResponseSchema.array()),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/room-type',
  summary: 'Crear tipo de habitación',
  tags,
  request: { body: jsonBody(createRoomTypeSchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Tipo creado.', roomTypeResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/room-type/{id}',
  summary: 'Editar o desactivar tipo de habitación',
  description: 'Solo cambia los campos enviados. Las estadías activas conservan la tarifa de hora extra copiada al ingresar.',
  tags,
  request: { params: roomTypeIdSchema, body: jsonBody(updateRoomTypeSchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Tipo actualizado.', roomTypeResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/room-type/{id}',
  summary: 'Eliminar tipo de habitación sin habitaciones',
  description: 'Si alguna habitación usa el tipo, responde 409: hay que cambiarlas de tipo o eliminarlas primero.',
  tags,
  request: { params: roomTypeIdSchema },
  responses: {
    ...adminOnly,
    204: { description: 'Tipo eliminado, sin cuerpo.' },
    ...errors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/room',
  summary: 'Tablero de habitaciones',
  description: 'Todas las habitaciones (también las desactivadas) ordenadas por piso y número, con su tipo, estado calculado y la estadía activa resumida.',
  tags,
  responses: {
    200: jsonResponse('Habitaciones con su estado.', roomResponseSchema.array()),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/room',
  summary: 'Crear habitación',
  tags,
  request: { body: jsonBody(createRoomSchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Habitación creada.', roomResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/room/{id}',
  summary: 'Editar o desactivar habitación',
  description: 'Solo cambia los campos enviados. No se puede desactivar una habitación ocupada.',
  tags,
  request: { params: roomIdSchema, body: jsonBody(updateRoomSchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Habitación actualizada.', roomResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/room/{id}',
  summary: 'Eliminar habitación sin estadías',
  description: 'Las estadías son el registro de huéspedes y no se borran: si la habitación tiene alguna, responde 409 y hay que desactivarla.',
  tags,
  request: { params: roomIdSchema },
  responses: {
    ...adminOnly,
    204: { description: 'Habitación eliminada, sin cuerpo.' },
    ...errors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/room/{id}/clean',
  summary: 'Marcar habitación como limpia',
  description: 'Disponible para el personal. Quita el estado de limpieza que deja el check-out.',
  tags,
  request: { params: roomIdSchema },
  responses: {
    200: jsonResponse('Habitación actualizada.', roomResponseSchema),
    ...readErrors,
    404: errorRef('NotFound'),
    422: errorRef('ValidationError'),
  },
});
