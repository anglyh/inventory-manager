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
}).meta({ id: 'CreateProduct' });

export const updateProductSchema = z.object({
  name: nameSchema,
  barcode: barcodeSchema.nullable().optional(),
  minStock: minStockSchema.optional(),
  salePrice: salePriceSchema,
  categoryId: categoryIdSchema,
}).meta({ id: 'UpdateProduct' });

export const productIdParamSchema = z.object({
  id: z.uuid('ID de producto inválido')
})

// Documents a query parameter without changing its validation.
const paramDoc = (description: string) => ({ param: { description } });

// Filter value that asks for products without a category.
const NO_CATEGORY = 'none';

export const listProductPaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1)
    .meta(paramDoc('Número de página para la paginación')),
  searchTerm: z.coerce.string().optional()
    .meta(paramDoc('Término opcional para buscar productos por nombre')),
  categoryId: z.coerce
    .string()
    .optional()
    .transform((value, ctx) => {
      const parts = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!parts.length) return undefined;
      if (parts.some((part) => part !== NO_CATEGORY && !z.uuid().safeParse(part).success)) {
        ctx.addIssue({ code: 'custom', message: 'ID de categoría inválido' });
        return z.NEVER;
      }
      return {
        categoryIds: parts.filter((part) => part !== NO_CATEGORY),
        withoutCategory: parts.includes(NO_CATEGORY),
      };
    })
    .meta(paramDoc('Filtra por ID de categoría. Acepta uno o varios UUID separados por coma; "none" incluye los productos sin categoría (ej. "<uuid>,none"). Si no se envía, retorna productos de todas las categorías.')),
  limit: z.coerce.number().int().positive().max(100).optional().default(12)
    .meta(paramDoc('Cantidad de productos a devolver por página')),
  stock: z.enum(['low']).optional()
    .meta(paramDoc('"low": solo productos con stock en o bajo el mínimo (por reponer), los más urgentes primero.')),
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
  categoryId: z.uuid().nullable(),
  categoryName: z.string().nullable(),
  hasMovements: z.boolean()
    .meta({ description: 'true si el producto ya tiene movimientos (incluso anulados); no admite carga inicial.' }),
}).meta({ id: 'ProductOption' });

export const barcodeLookupParamSchema = z.object({
  code: z.string().meta({
    param: { description: 'Código de barras GTIN (EAN-8, UPC-A, EAN-13 o GTIN-14) con dígito verificador válido', example: '7750182005814' },
  }),
});

export const barcodeSuggestionSourceSchema = z.enum(['OPEN_FOOD_FACTS', 'OPEN_PRODUCTS_FACTS', 'OPEN_BEAUTY_FACTS']);

export const barcodeLookupSchema = z.object({
  code: z.string().meta({ example: '7750182005814' }),
  existingProduct: z.object({ id: z.uuid(), name: z.string() }).nullable()
    .meta({ description: 'Producto de la tienda (activo o desactivado) que ya usa este código; si existe no se consulta ninguna fuente externa.' }),
  suggestion: z.object({
    name: z.string().meta({ example: 'Gaseosa Inca Kola 1.5 lt.' }),
    brand: z.string().nullable(),
    quantity: z.string().nullable(),
    imageUrl: z.string().nullable().meta({ description: 'Imagen de la fuente (solo para vista previa; no se guarda).' }),
    source: barcodeSuggestionSourceSchema,
  }).nullable().meta({ description: 'Datos sugeridos de una base abierta. null si no se encontró, si la fuente no respondió o si se alcanzó el límite de consultas.' }),
}).meta({ id: 'BarcodeLookup' });

export type BarcodeSuggestionSource = z.infer<typeof barcodeSuggestionSourceSchema>;
export type BarcodeLookup = z.infer<typeof barcodeLookupSchema>;
export type BarcodeSuggestion = NonNullable<BarcodeLookup['suggestion']>;
