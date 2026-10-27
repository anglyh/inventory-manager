import z from 'zod';
import {
  barcodeLookupParamSchema,
  barcodeLookupSchema,
  createProductSchema,
  listProductPaginationSchema,
  productIdParamSchema,
  productOptionSchema,
  productResponseSchema,
  productSearchItemSchema,
  productsPageSchema,
  productWithStockSchema,
  updateProductSchema,
} from '../../schemas/product.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { bearerAuth, registry } from '../registry.js';
import { errorRef, standardErrors, adminOnly } from '../responses.js';

const basePath = '/api/product';

export const productTag = {
  name: 'Products',
  description: 'Endpoints para la gestión de productos',
};

const tags = [productTag.name];

// Errors returned by every product operation.
const commonErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

/** Product id path parameter, documented per operation. */
const idParams = (description: string) => z.object({
  id: productIdParamSchema.shape.id.meta({ param: { description } }),
});

// The controller reads this query parameter without a Zod schema; documentation only.
const searchByNameQuerySchema = z.object({
  searchTerm: z.string().optional().meta({
    param: { description: 'Término de búsqueda parcial por nombre de producto', example: 'agua' },
  }),
});

registry.registerPath({
  method: 'post',
  path: basePath,
  summary: 'Crear un nuevo producto',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(createProductSchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Producto creado.', productResponseSchema),
    ...commonErrors,
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Obtener todos los productos',
  tags,
  security: bearerAuth,
  request: { query: listProductPaginationSchema },
  responses: {
    200: jsonResponse('Página de productos activos.', productsPageSchema),
    ...commonErrors,
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/options`,
  summary: 'Opciones de productos para desplegables',
  description: 'Lista todos los productos activos con id, nombre, precio de venta, código de barras, stock y categoría (sin paginación), pensado para selects y formularios de venta u otros flujos.',
  tags,
  security: bearerAuth,
  responses: {
    200: jsonResponse('Opciones de productos activos con precio, código de barras, stock y categoría.', productOptionSchema.array()),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/{id}`,
  summary: 'Consultar producto y stock de la tienda',
  tags,
  request: { params: productIdParamSchema },
  responses: {
    200: jsonResponse('Producto con stock actual.', productWithStockSchema),
    ...standardErrors(),
  },
});

registry.registerPath({
  method: 'put',
  path: `${basePath}/{id}`,
  summary: 'Actualizar un producto existente',
  tags,
  security: bearerAuth,
  request: { params: idParams('ID UUID del producto a actualizar'), body: jsonBody(updateProductSchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Producto actualizado.', productResponseSchema),
    ...commonErrors,
    404: errorRef('NotFound'),
    409: errorRef('Conflict'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'delete',
  path: `${basePath}/{id}`,
  summary: 'Desactivar un producto',
  tags,
  security: bearerAuth,
  request: { params: idParams('ID UUID del producto a eliminar') },
  responses: {
    ...adminOnly,
    204: { description: 'Producto desactivado. Sin cuerpo de respuesta.' },
    ...commonErrors,
    404: errorRef('NotFound'),
    422: errorRef('ValidationError'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/search/by-name`,
  summary: 'Buscar productos por nombre',
  description: 'Retorna una lista de productos cuyo nombre coincide parcialmente con el término de búsqueda (insensible a mayúsculas y acentos)',
  tags,
  security: bearerAuth,
  request: { query: searchByNameQuerySchema },
  responses: {
    200: jsonResponse('Productos encontrados.', productSearchItemSchema.array()),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/barcode-lookup/{code}`,
  summary: 'Buscar datos de un producto por código de barras',
  description: 'Primero busca un producto de la tienda con ese código. Si no existe, consulta Open Food Facts, Open Products Facts y Open Beauty Facts (con caché en memoria y un máximo de 15 consultas externas por minuto) y devuelve datos sugeridos para registrar el producto. Un código con dígito verificador inválido devuelve 400.',
  tags,
  security: bearerAuth,
  request: { params: barcodeLookupParamSchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Producto existente, datos sugeridos o ninguno de los dos.', barcodeLookupSchema),
    ...commonErrors,
  },
});
