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
  ProfitSummary: object({ ...range, ...profit, salesCount: integer, avgTicket: money }),
  ProfitByProduct: object({
    ...range,
    products: array(object({ productId: uuid, productName: string, quantitySold: integer, ...profit })),
  }),
};

export const cashRegisterParameters = {
  CashRegisterId: { in: 'path', name: 'id', required: true, schema: uuid },
  CashRegisterPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CashRegisterLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 12 } },
  CashMovementPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CashMovementLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  CurrentCashMovementPage: { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
  CurrentCashMovementLimit: { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 5 } },
};
