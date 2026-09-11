import type { ApiError } from '../types/api.types.js';

// Esquemas de respuesta HTTP: los importes NUMERIC de PostgreSQL se serializan como strings.
const uuid = { type: 'string', format: 'uuid' };
const dateTime = { type: 'string', format: 'date-time' };
const string = { type: 'string' };
const integer = { type: 'integer' };
const boolean = { type: 'boolean' };
const money = { type: 'string', example: '20.00' };
const nullable = (schema: object) => ({ ...schema, nullable: true });
const array = (items: object) => ({ type: 'array', items });
const object = (properties: Record<string, object>, required = Object.keys(properties)) => ({
  type: 'object', required, properties,
});

const product = {
  id: uuid, name: string, barcode: nullable(string), salePrice: money,
  unitCostAvg: nullable(money), minStock: integer, isActive: boolean,
  categoryId: nullable(uuid), createdAt: dateTime,
};
const productSearch = { id: uuid, name: string, salePrice: money };
const user = object({ id: uuid, name: string, email: { type: 'string', format: 'email' } });
const range = { from: dateTime, to: dateTime };
const profit = { revenue: money, cogs: money, profit: money, marginPct: money };
const movement = object({
  id: uuid,
  storeId: uuid,
  cashRegisterId: nullable(uuid),
  movementType: { type: 'string', enum: ['IN', 'OUT'] },
  reason: { type: 'string', enum: ['PURCHASE', 'SALE', 'LOSS_EXPIRED', 'LOSS_DAMAGED', 'COUNT_SURPLUS', 'COUNT_SHORTAGE', 'INITIAL_LOAD', 'MANUAL_CORRECTION'] },
  paymentMethod: { type: 'string', nullable: true, enum: ['CASH', 'YAPE', null] },
  supplierId: nullable(uuid),
  status: { type: 'string', enum: ['COMPLETED', 'VOIDED'] },
  voidedAt: nullable(dateTime),
  voidReason: nullable(string),
  notes: nullable(string),
  createdAt: dateTime,
  totalAmount: money,
  items: array(object({ productId: uuid, productName: string, unitPrice: money, quantity: integer })),
});

export const responseSchemas = {
  ApiError: object({
    success: { type: 'boolean', enum: [false] },
    error: object({
      code: { type: 'string', enum: ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST', 'INTERNAL_ERROR', 'INVALID_JSON', 'DB_ERROR', 'VALIDATION_ERROR'] },
      message: string,
      field: { ...string, description: 'Opcional. Campo asociado al error, cuando corresponde.' },
      fields: {
        ...array(object({ field: string, message: string })),
        description: 'Detalle de campos inválidos en errores de validación (422).',
      },
    }, ['code', 'message']),
  }),
  AuthResponse: object({ token: string, user }),
  AuthStatusResponse: object({
    token: string,
    user: object({
      userId: uuid, storeId: uuid, name: string, email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['ADMIN', 'GUEST'] },
      iat: integer, exp: integer,
    }),
  }),
  Category: object({ id: uuid, storeId: uuid, name: string, createdAt: dateTime }),
  Product: object({ ...product, storeId: uuid }),
  ProductsPage: object({
    data: array(object({ ...product, unitCostAvg: money, stock: integer, categoryName: nullable(string) })),
    totalItems: integer,
    totalPages: integer,
  }),
  ProductSearchItem: object(productSearch),
  ProductOption: object({ ...productSearch, barcode: nullable(string), stock: integer, categoryName: nullable(string) }),
  InventoryMovement: movement,
  InventoryMovementsPage: object({
    data: array({ $ref: '#/components/schemas/InventoryMovement' }),
    nextCursor: nullable(object({ cursorDate: dateTime, cursorId: uuid })),
  }),
  ProfitSummary: object({ ...range, ...profit, salesCount: integer, avgTicket: money }),
  ProfitByProduct: object({
    ...range,
    products: array(object({ productId: uuid, productName: string, quantitySold: integer, ...profit })),
  }),
  SeedResult: object({
    message: string,
    data: object({
      user: object({ email: string, password: string, created: boolean }),
      categoriesCreated: integer,
      productsCreated: integer,
      inventoryMovementsCreated: object({ entries: integer, exits: integer, total: integer }),
    }),
  }),
};

const errorResponse = (description: string, error: ApiError) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
      example: { success: false, error },
    },
  },
});

const movementConflictResponse = (includeStockError: boolean) => ({
  description: includeStockError
    ? 'Producto desactivado o stock insuficiente para una salida de inventario.'
    : 'Producto desactivado; no admite entradas de inventario.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
      examples: {
        ...(includeStockError ? {
          insufficientStock: {
            summary: 'Stock insuficiente (solo salidas)',
            value: {
              success: false,
              error: { code: 'CONFLICT', message: 'Stock insuficiente para "Agua mineral 500ml"' },
            },
          },
        } : {}),
        inactiveProduct: {
          summary: 'Producto desactivado',
          value: {
            success: false,
            error: { code: 'CONFLICT', message: 'El producto "Agua mineral 500ml" está desactivado y no admite movimientos' },
          },
        },
      },
    },
  },
});

export const errorResponses = {
  InventoryEntryConflict: movementConflictResponse(false),
  InventoryExitConflict: movementConflictResponse(true),
  DatabaseUnavailable: {
    description: 'Base de datos no disponible.',
    content: { 'application/json': { schema: object({ message: { type: 'string', example: 'Database unavailable' } }) } },
  },
  BadRequest: errorResponse(
    'Solicitud incorrecta, JSON inválido o token ausente, mal formado o expirado.',
    { code: 'BAD_REQUEST', message: 'Token no proporcionado' },
  ),
  Unauthorized: errorResponse(
    'Credenciales incorrectas o usuario no autorizado.',
    { code: 'UNAUTHORIZED', message: 'No autorizado' },
  ),
  NotFound: errorResponse(
    'Recurso no encontrado.',
    { code: 'NOT_FOUND', message: 'Recurso no encontrado' },
  ),
  Conflict: errorResponse(
    'Conflicto: registro duplicado, producto desactivado o stock insuficiente.',
    { code: 'CONFLICT', message: 'El registro ya existe' },
  ),
  ValidationError: errorResponse(
    'Error de validación del cuerpo, parámetros o query. Incluye los campos inválidos.',
    {
      code: 'VALIDATION_ERROR', message: 'Error de validación',
      fields: [{ field: 'items', message: 'Debe incluir al menos un producto' }],
    },
  ),
  InternalError: errorResponse(
    'Error interno del servidor.',
    { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  ),
};
