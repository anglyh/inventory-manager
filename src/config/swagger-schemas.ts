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
  supplierName: nullable(string),
  createdBy: nullable(uuid),
  createdByName: nullable(string),
  voidedBy: nullable(uuid),
  status: { type: 'string', enum: ['COMPLETED', 'VOIDED'] },
  voidedAt: nullable(dateTime),
  voidReason: nullable(string),
  notes: nullable(string),
  createdAt: dateTime,
  totalAmount: money,
  items: array(object({ productId: uuid, productName: string, unitPrice: money, unitCost: money, quantity: integer })),
});

const cashSummary = nullable(object({
  cashSales: money, yapeSales: money, totalSales: money, salesCount: integer,
  cashIn: money, cashOut: money,
  expectedCash: { ...money, description: 'Solo se envía a ADMIN; se omite por completo para GUEST.' },
  difference: nullable(money),
}, ['cashSales', 'yapeSales', 'totalSales', 'salesCount', 'cashIn', 'cashOut', 'difference']));
const cashRegister = object({
  id: uuid, status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
  openedAt: dateTime, openingAmount: money, openedBy: nullable(uuid), openedByName: nullable(string), notes: nullable(string),
  closedAt: nullable(dateTime), closingAmount: nullable(money), closedBy: nullable(uuid), closedByName: nullable(string),
  closingNotes: nullable(string), summary: cashSummary,
});
const cashMovement = object({
  id: uuid, cashRegisterId: uuid, type: { type: 'string', enum: ['CASH_IN', 'CASH_OUT'] },
  amount: money, reason: string, createdBy: nullable(uuid), createdByName: nullable(string), createdAt: dateTime,
});
const inputMoney = { type: 'number', minimum: 0, maximum: 99999999.99, multipleOf: 0.01 };
const inputNotes = { type: 'string', maxLength: 500 };

export const responseSchemas = {
  CashRegister: cashRegister,
  NullableCashRegister: nullable(cashRegister),
  CashRegisterPage: object({
    data: array({ $ref: '#/components/schemas/CashRegister' }),
    meta: object({ page: integer, limit: integer, total: integer, totalPages: integer }),
  }),
  CashMovementPage: object({
    data: array(cashMovement),
    meta: object({ page: integer, limit: integer, total: integer, totalPages: integer }),
  }),
  CashRegisterOpened: object({ id: uuid, status: { type: 'string', enum: ['OPEN'] } }),
  OpenCashRegister: {
    ...object({ openingAmount: { ...inputMoney, example: 100 }, notes: inputNotes }, ['openingAmount']),
    additionalProperties: false,
  },
  CloseCashRegister: {
    ...object({
      closingAmount: { ...inputMoney, example: 245 },
      notes: { ...inputNotes, description: 'Obligatorio y no vacío si existe diferencia con el efectivo esperado.', example: 'Faltan 5 soles' },
    }, ['closingAmount']),
    additionalProperties: false,
  },
  CreateCashMovement: {
    ...object({
      type: { type: 'string', enum: ['CASH_IN', 'CASH_OUT'], example: 'CASH_OUT' },
      amount: { ...inputMoney, minimum: 0.01, example: 20 },
      reason: { type: 'string', minLength: 1, maxLength: 500, example: 'Dinero llevado al banco' },
    }),
    additionalProperties: false,
  },
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

const validationResponse = (field: string, message: string) => errorResponse(
  'Datos inválidos en el cuerpo, identificador o query. Los campos afectados aparecen en error.fields.',
  { code: 'VALIDATION_ERROR', message: 'Error de validación', fields: [{ field, message }] },
);

export const cashRegisterParameters = {
  CashRegisterId: { in: 'path', name: 'id', required: true, schema: uuid },
  CashRegisterPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CashRegisterLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 12 } },
  CashMovementPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CashMovementLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  CurrentCashMovementPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CurrentCashMovementLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 5 } },
};

const movementConflictResponse = (includeStockError: boolean) => ({
  description: includeStockError
    ? 'Producto desactivado o stock insuficiente para una salida de inventario.'
    : 'Producto desactivado o carga inicial sobre un producto que ya tiene movimientos.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
      examples: {
        ...(!includeStockError ? {
          alreadyInitialized: {
            summary: 'Solo carga inicial: producto con historial',
            value: { success: false, error: { code: 'CONFLICT', message: 'El producto ya tiene movimientos; utilice una compra o un ajuste' } },
          },
        } : {}),
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
  OperationConflict: errorResponse('Conflicto de estado o registro asociado a otras operaciones. El mensaje indica el motivo concreto.', {
    code: 'CONFLICT', message: 'La operación no puede realizarse con el estado actual',
  }),
  CashRegisterAlreadyOpen: errorResponse('La tienda ya tiene una caja abierta.', { code: 'CONFLICT', message: 'Ya existe una caja abierta en esta tienda' }),
  CashRegisterClosed: errorResponse('La caja ya está cerrada.', { code: 'CONFLICT', message: 'La caja está cerrada' }),
  CashRegisterNotFound: errorResponse('Caja inexistente o perteneciente a otra tienda.', { code: 'NOT_FOUND', message: 'La caja no existe' }),
  CashRegisterOpeningValidation: validationResponse('openingAmount', 'El efectivo inicial debe ser un importe no negativo con máximo dos decimales'),
  CashRegisterClosingValidation: validationResponse('notes', 'Debe explicar la diferencia entre el efectivo contado y el esperado'),
  CashMovementValidation: validationResponse('reason', 'El motivo es obligatorio'),
  CashRegisterQueryValidation: validationResponse('page', 'page debe ser >= 1 y limit debe estar entre 1 y 100'),
  CashMovementQueryValidation: validationResponse('limit', 'page debe ser >= 1 y limit debe estar entre 1 y 100'),
  CashRegisterIdValidation: validationResponse('id', 'ID de caja inválido'),
  CashMovementConflict: {
    description: 'Caja cerrada o efectivo insuficiente para el retiro.',
    content: { 'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
      examples: {
        closed: { summary: 'Caja cerrada', value: { success: false, error: { code: 'CONFLICT', message: 'La caja está cerrada' } } },
        insufficientCash: { summary: 'Retiro superior al efectivo esperado', value: { success: false, error: { code: 'CONFLICT', message: 'Efectivo insuficiente en la caja para realizar el retiro' } } },
      },
    } },
  },
  SaleConflict: {
    description: 'Sin caja abierta, caja cerrada, producto desactivado o stock insuficiente.',
    content: { 'application/json': {
      schema: { $ref: '#/components/schemas/ApiError' },
      examples: {
        noOpenRegister: { summary: 'Se requiere abrir caja', value: { success: false, error: { code: 'CONFLICT', message: 'Debe abrir una caja antes de registrar una venta' } } },
        closed: { summary: 'Caja cerrada', value: { success: false, error: { code: 'CONFLICT', message: 'La caja está cerrada' } } },
        ...movementConflictResponse(true).content['application/json'].examples,
      },
    } },
  },
  InventoryEntryConflict: movementConflictResponse(false),
  InventoryExitConflict: movementConflictResponse(true),
  DatabaseUnavailable: errorResponse('Base de datos no disponible.', { code: 'DB_ERROR', message: 'Base de datos no disponible' }),
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
