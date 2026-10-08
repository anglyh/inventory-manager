import { supplierIdSchema, supplierResponseSchema, supplierSchema } from '../../schemas/supplier.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { standardErrors } from '../responses.js';

const basePath = '/api/supplier';
const tags = ['Suppliers'];

const errors = standardErrors();

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Listar proveedores de la tienda',
  tags,
  responses: {
    200: jsonResponse('Proveedores disponibles para compras.', supplierResponseSchema.array()),
    ...errors,
  },
});

registry.registerPath({
  method: 'post',
  path: basePath,
  summary: 'Crear proveedor',
  tags,
  request: { body: jsonBody(supplierSchema) },
  responses: {
    201: jsonResponse('Proveedor creado.', supplierResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'put',
  path: `${basePath}/{id}`,
  summary: 'Editar proveedor',
  tags,
  request: { params: supplierIdSchema, body: jsonBody(supplierSchema) },
  responses: {
    200: jsonResponse('Proveedor actualizado.', supplierResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'delete',
  path: `${basePath}/{id}`,
  summary: 'Eliminar proveedor sin compras asociadas',
  description: 'Si el proveedor tiene compras, responde 409 para conservar la relación histórica.',
  tags,
  request: { params: supplierIdSchema },
  responses: {
    204: { description: 'Proveedor eliminado, sin cuerpo.' },
    ...errors,
  },
});
