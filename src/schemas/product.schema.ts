import z from 'zod';

const nameSchema = z.string('Nombre requerido').trim().min(1, 'Nombre requerido').max(50, 'Máximo 50 caracteres')
  .meta({ example: 'Agua mineral 500ml' });
// JSON bodies carry real numbers: coercion would turn null, '' or false into 0.
const salePriceSchema = z.number('Precio de venta requerido').nonnegative('Precio no puede ser negativo')
  .max(99999999.99, 'Precio fuera de rango')
  .multipleOf(0.01, 'Precio debe tener como máximo 2 decimales')
  // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
  .meta({ multipleOf: 0.01, example: 2.5 });
const minStockSchema = z.number('Stock mínimo debe ser un número').int('Debe ser un número entero').nonnegative('No puede ser negativo')
  .meta({ example: 10 });
const barcodeSchema = z.string().max(50, 'Máximo 50 caracteres').meta({ example: '7501030300050' });
const categoryIdSchema = z.uuid('ID de categoría inválido').nullable().optional()
  .meta({ example: '550e8400-e29b-41d4-a716-446655440000' });

export const createProductSchema = z.object({
  name: nameSchema,
  minStock: minStockSchema.optional().default(0),
  barcode: barcodeSchema.optional(),
  salePrice: salePriceSchema,
  categoryId: categoryIdSchema,
})

export const updateProductSchema = z.object({
  name: nameSchema,
  barcode: barcodeSchema.nullable().optional(),
  minStock: minStockSchema.optional(),
  salePrice: salePriceSchema,
  categoryId: categoryIdSchema,
})

export const productIdParamSchema = z.object({
  id: z.uuid('ID de producto inválido')
})

// Documents a query parameter without changing its validation.
const paramDoc = (description: string) => ({ param: { description } });

export const listProductPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1)
    .meta(paramDoc('Número de página para la paginación')),
  searchTerm: z.coerce.string().optional()
    .meta(paramDoc('Término opcional para buscar productos por nombre')),
  category: z.coerce
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    })
    .meta(paramDoc('Filtra por nombre de categoría. Acepta uno o varios nombres separados por coma (ej. "Bebidas" o "Bebidas,Snacks"). Comparación insensible a mayúsculas/acentos. Si no se envía, retorna productos de todas las categorías.')),
  limit: z.coerce.number().int().positive().max(100).optional().default(12)
    .meta(paramDoc('Cantidad de productos a devolver por página')),
})

export type ListProductPagination = z.infer<typeof listProductPaginationSchema>
export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;

// Response schemas. NUMERIC amounts from PostgreSQL are serialized as strings.
const moneySchema = z.string().meta({ example: '20.00' });

const productFields = {
  id: z.uuid(),
  name: z.string(),
  barcode: z.string().nullable(),
  salePrice: moneySchema,
  unitCostAvg: moneySchema.nullable(),
  minStock: z.number().int(),
  isActive: z.boolean(),
  categoryId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
};

export const productResponseSchema = z.object({
  ...productFields,
  storeId: z.uuid(),
}).meta({ id: 'Product' });

/** Product with the current stock of the store. */
export const productWithStockSchema = z.intersection(productResponseSchema, z.object({ stock: z.number().int() }));

export const productsPageSchema = z.object({
  data: z.array(z.object({
    ...productFields,
    unitCostAvg: moneySchema,
    stock: z.number().int(),
    categoryName: z.string().nullable(),
  })),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
}).meta({ id: 'ProductsPage' });

const productSearchFields = {
  id: z.uuid(),
  name: z.string(),
  salePrice: moneySchema,
};

export const productSearchItemSchema = z.object(productSearchFields).meta({ id: 'ProductSearchItem' });

export const productOptionSchema = z.object({
  ...productSearchFields,
  barcode: z.string().nullable(),
  stock: z.number().int(),
  categoryName: z.string().nullable(),
}).meta({ id: 'ProductOption' });
