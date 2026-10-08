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
export const responseSchemas = {
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
