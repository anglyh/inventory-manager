import z from 'zod';
import {
  categoryIdParamSchema,
  categoryResponseSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../../schemas/category.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { bearerAuth, registry } from '../registry.js';
import { errorRef, adminOnly } from '../responses.js';

const basePath = '/api/category';

export const categoryTag = {
  name: 'Categories',
  description: 'Endpoints para gestión de categorías',
};

const tags = [categoryTag.name];

// Errors returned by every category operation.
const commonErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

/** Category id path parameter, documented per operation. */
const idParams = (description: string) => z.object({
  id: categoryIdParamSchema.shape.id.meta({ param: { description } }),
});

registry.registerPath({
  method: 'post',
  path: basePath,
  summary: 'Crear una nueva categoría',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(createCategorySchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Categoría creada.', categoryResponseSchema),
    ...commonErrors,
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Listar todas las categorías',
  tags,
  security: bearerAuth,
  responses: {
    200: jsonResponse('Listado de categorías.', categoryResponseSchema.array()),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'put',
  path: `${basePath}/{id}`,
  summary: 'Actualizar una categoría existente',
  tags,
  security: bearerAuth,
  request: { params: idParams('ID UUID de la categoría a actualizar'), body: jsonBody(updateCategorySchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Categoría actualizada.', categoryResponseSchema),
    ...commonErrors,
    404: errorRef('NotFound'),
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'delete',
  path: `${basePath}/{id}`,
  summary: 'Eliminar una categoría',
  description: 'Elimina una categoría del usuario. Los productos que estaban asociados quedan con categoryId = null.',
  tags,
  security: bearerAuth,
  request: { params: idParams('ID UUID de la categoría a eliminar') },
  responses: {
    ...adminOnly,
    204: { description: 'Categoría eliminada. Sin cuerpo de respuesta.' },
    ...commonErrors,
    404: errorRef('NotFound'),
    422: errorRef('ValidationError'),
  },
});
