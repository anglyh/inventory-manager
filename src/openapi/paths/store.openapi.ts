import { storeSettingsSchema, updateStoreSettingsSchema } from '../../schemas/store.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { adminOnly, errorRef } from '../responses.js';

export const storeTag = {
  name: 'Store',
  description: 'Ajustes de la tienda y del hostal',
};

const tags = [storeTag.name];

const errors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  404: errorRef('NotFound'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: '/api/store/settings',
  summary: 'Consultar ajustes del hostal',
  description: 'Hora de salida de las estadías por noche y tolerancia antes de sugerir horas adicionales.',
  tags,
  responses: {
    200: jsonResponse('Ajustes actuales.', storeSettingsSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/store/settings',
  summary: 'Editar ajustes del hostal',
  tags,
  request: { body: jsonBody(updateStoreSettingsSchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Ajustes actualizados.', storeSettingsSchema),
    ...errors,
    422: errorRef('ValidationError'),
  },
});
