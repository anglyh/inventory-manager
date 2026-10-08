// Contratos de las operaciones nuevas. Se integran con las rutas documentadas por JSDoc.
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: 'string', format: 'uuid' };
const json = (schema: object) => ({ 'application/json': { schema } });
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

export const inventoryPaths = {
  '/api/product/{id}': {
    get: {
      tags: ['Products'], summary: 'Consultar producto y stock de la tienda', parameters: [idParameter],
      responses: { ...errors, 200: response('Producto con stock actual.', {
        allOf: [ref('Product'), { type: 'object', required: ['stock'], properties: { stock: { type: 'integer' } } }],
      }) },
    },
  },
};
