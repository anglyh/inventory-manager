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
  StockCount: object({
    notes: { ...text, minLength: 1, maxLength: 500 },
    items: { type: 'array', minItems: 1, items: object({
      productId: uuid, countedQuantity: { type: 'integer', minimum: 0, maximum: 2147483647 },
    }) },
  }),
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
  '/api/inventory-movement/{id}': {
    get: {
      tags: ['InventoryMovements'], summary: 'Consultar detalle de movimiento completado o anulado', parameters: [idParameter],
      responses: { ...errors, 200: response('Movimiento de la tienda con sus artículos.', ref('InventoryMovement')) },
    },
  },
  '/api/inventory-movement/stock-counts': {
    post: {
      tags: ['InventoryMovements'], summary: 'Registrar conteo físico y calcular diferencias',
      description: 'Enviar las cantidades contadas, no diferencias. Pausar movimientos mientras se cuenta. El servidor bloquea los productos y registra hasta dos movimientos: sobrantes IN y faltantes OUT, en una transacción. 409 si todo coincide; no registra movimientos vacíos. No afecta caja.',
      requestBody: body(ref('StockCount')),
      responses: { ...errors, 204: response('Conteo aplicado, sin cuerpo. Actualizar productos e historial.') },
    },
  },
  '/api/inventory-movement/{id}/void': {
    post: {
      tags: ['InventoryMovements'], summary: 'Anular un movimiento registrado por error', parameters: [idParameter],
      description: 'Exige motivo. Rechaza movimientos ya anulados o con movimientos completados posteriores de alguno de sus productos. Las ventas requieren su caja original abierta; las CASH requieren efectivo suficiente para revertir el importe. Las entradas restauran el costo anterior guardado y no pueden dejar stock negativo. No es una devolución parcial ni permite cambiar cierres históricos. No registre otro retiro por la misma reversión de venta.',
      requestBody: body(object({ reason: { ...text, minLength: 1, maxLength: 500 } })),
      responses: { ...errors, 204: response('Movimiento anulado, sin cuerpo. Actualizar inventario, reportes y caja si corresponde.') },
    },
  },
};

export const inventoryHistoryParameters = [
  { in: 'query', name: 'reason', schema: { ...text, enum: ['PURCHASE', 'SALE', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD', 'MANUAL_CORRECTION'] }, description: 'Motivo exacto; se combina con group y movementType.' },
  { in: 'query', name: 'productId', schema: uuid, description: 'Movimientos que contienen este producto; conserva todos los artículos del movimiento.' },
  { in: 'query', name: 'from', schema: { ...text, format: 'date-time' }, description: 'Fecha inicial inclusiva, ISO con zona horaria.' },
  { in: 'query', name: 'to', schema: { ...text, format: 'date-time' }, description: 'Fecha final exclusiva, posterior a from.' },
];
