// Contratos de las operaciones nuevas. Se integran con las rutas documentadas por JSDoc.
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: 'string', format: 'uuid' };
const text = { type: 'string' };
const object = (properties: Record<string, object>, required = Object.keys(properties)) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const json = (schema: object) => ({ 'application/json': { schema } });
const body = (schema: object) => ({ required: true, content: json(schema) });
const idParameter = { in: 'path', name: 'id', required: true, schema: uuid };
const errors = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  404: { $ref: '#/components/responses/NotFound' },
  409: { $ref: '#/components/responses/OperationConflict' },
  422: { $ref: '#/components/responses/ValidationError' },
  500: { $ref: '#/components/responses/InternalError' },
  503: { $ref: '#/components/responses/DatabaseUnavailable' },
};
const response = (description: string, schema?: object) => ({
  description, ...(schema ? { content: json(schema) } : {}),
});
const supplierInput = object({ name: { ...text, minLength: 1, maxLength: 50 } });

export const inventorySchemas = {
  Supplier: object({ id: uuid, storeId: uuid, name: text, createdAt: { type: 'string', format: 'date-time' } }),
  StoreUser: object({ id: uuid, name: text, email: { ...text, format: 'email' }, role: { ...text, enum: ['ADMIN', 'GUEST'] } }),
};

export const inventoryPaths = {
  '/api/supplier': {
    get: {
      tags: ['Suppliers'], summary: 'Listar proveedores de la tienda',
      responses: { ...errors, 200: response('Proveedores disponibles para compras.', { type: 'array', items: ref('Supplier') }) },
    },
    post: {
      tags: ['Suppliers'], summary: 'Crear proveedor', requestBody: body(supplierInput),
      responses: { ...errors, 201: response('Proveedor creado.', ref('Supplier')) },
    },
  },
  '/api/supplier/{id}': {
    put: {
      tags: ['Suppliers'], summary: 'Editar proveedor', parameters: [idParameter], requestBody: body(supplierInput),
      responses: { ...errors, 200: response('Proveedor actualizado.', ref('Supplier')) },
    },
    delete: {
      tags: ['Suppliers'], summary: 'Eliminar proveedor sin compras asociadas', parameters: [idParameter],
      description: 'Si el proveedor tiene compras, responde 409 para conservar la relación histórica.',
      responses: { ...errors, 204: response('Proveedor eliminado, sin cuerpo.') },
    },
  },
  '/api/store-user': {
    get: {
      tags: ['StoreUsers'], summary: 'Listar usuarios de la tienda y resolver responsables',
      responses: { ...errors, 200: response('Usuarios de esta tienda, sin contraseñas.', { type: 'array', items: ref('StoreUser') }) },
    },
    post: {
      tags: ['StoreUsers'], summary: 'Añadir trabajador a la tienda actual',
      description: 'Solo ADMIN. Crea un usuario GUEST en la misma tienda; puede operar caja e inventario. No crea otra tienda ni inicia sesión automáticamente.',
      requestBody: body(object({
        name: { ...text, minLength: 1, maxLength: 50 },
        email: { ...text, format: 'email' },
        password: { ...text, minLength: 12, pattern: '[A-Z]', writeOnly: true },
      })),
      responses: { ...errors, 403: response('Solo administradores.', ref('ApiError')), 201: response('Trabajador creado.', ref('StoreUser')) },
    },
  },
  '/api/product/{id}': {
    get: {
      tags: ['Products'], summary: 'Consultar producto y stock de la tienda', parameters: [idParameter],
      responses: { ...errors, 200: response('Producto con stock actual.', {
        allOf: [ref('Product'), { type: 'object', required: ['stock'], properties: { stock: { type: 'integer' } } }],
      }) },
    },
  },
};
