import z from 'zod';

export const expenseGroupSchema = z.enum(['LODGING', 'GENERAL']).meta({
  id: 'ExpenseGroup',
  description: 'LODGING: costo del hospedaje (resta del resultado del hospedaje). GENERAL: gasto compartido (resta de la ganancia neta).',
});

export const expenseSourceSchema = z.enum(['CASH_REGISTER', 'OUTSIDE']).meta({
  id: 'ExpenseSource',
  description: 'CASH_REGISTER: sale de la caja abierta (crea un retiro). OUTSIDE: Yape, banco o bolsillo del dueño; no toca la caja.',
});

// --- Categorías ------------------------------------------------------------------

const categoryFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50).meta({ example: 'Útiles de aseo' }),
  group: expenseGroupSchema,
};

export const createExpenseCategorySchema = z.object(categoryFields).strict().meta({ id: 'CreateExpenseCategory' });

export const updateExpenseCategorySchema = z.object(categoryFields).partial().extend({
  isActive: z.boolean().optional(),
}).strict().meta({ id: 'UpdateExpenseCategory' });

export const expenseCategoryIdSchema = z.object({ id: z.uuid('ID de categoría inválido') });

/** Categorías con las que empieza cada tienda nueva (también las usa el seed). */
export const DEFAULT_EXPENSE_CATEGORIES: { name: string; group: z.infer<typeof expenseGroupSchema> }[] = [
  { name: 'Útiles de aseo', group: 'LODGING' },
  { name: 'Artículos de limpieza', group: 'LODGING' },
  { name: 'Lavandería', group: 'LODGING' },
  { name: 'Cable y streaming', group: 'LODGING' },
  { name: 'Luz', group: 'GENERAL' },
  { name: 'Agua', group: 'GENERAL' },
  { name: 'Internet', group: 'GENERAL' },
  { name: 'Sueldos', group: 'GENERAL' },
  { name: 'Alquiler', group: 'GENERAL' },
  { name: 'Otros', group: 'GENERAL' },
];

export type CreateExpenseCategoryDTO = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryDTO = z.infer<typeof updateExpenseCategorySchema>;

// --- Gastos ----------------------------------------------------------------------

export const createExpenseSchema = z.object({
  categoryId: z.uuid('ID de categoría inválido'),
  amount: z.number('Importe requerido').positive('Debe ser mayor a cero').max(99999999.99, 'Importe fuera de rango')
    .multipleOf(0.01, 'Importe debe tener como máximo 2 decimales')
    // zod-to-openapi does not emit Zod's multipleOf check, so it is documented explicitly.
    .meta({ multipleOf: 0.01, example: 35.5 }),
  spentOn: z.iso.date('Fecha inválida (AAAA-MM-DD)').optional()
    .meta({ description: 'Día de Lima al que corresponde el gasto. Por defecto, hoy.', example: '2026-10-20' }),
  description: z.string().trim().max(500).nullable().optional().meta({ example: 'Papel higiénico y jabón' }),
  source: expenseSourceSchema,
}).strict().meta({ id: 'CreateExpense' });

export const expenseIdSchema = z.object({ id: z.uuid('ID de gasto inválido') });

export const expenseListQuerySchema = z.object({
  from: z.coerce.date().optional().meta({ description: 'Inicio del rango (inclusive), ISO con zona horaria. Se compara con el día Lima del gasto.' }),
  to: z.coerce.date().optional().meta({ description: 'Fin del rango (exclusivo), ISO con zona horaria.' }),
  categoryId: z.uuid('ID de categoría inválido').optional(),
  group: expenseGroupSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).strict()
  .refine(q => !q.from || !q.to || q.from.getTime() < q.to.getTime(), {
    message: 'from debe ser anterior a to', path: ['to'],
  });

export type CreateExpenseDTO = z.infer<typeof createExpenseSchema>;
export type ExpenseListQueryDTO = z.infer<typeof expenseListQuerySchema>;

// --- Responses (NUMERIC amounts from PostgreSQL are serialized as strings) --------

const moneySchema = z.string().meta({ example: '35.50' });

export const expenseCategoryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  group: expenseGroupSchema,
  isActive: z.boolean(),
  expenseCount: z.number().int().meta({ description: 'Gastos registrados con esta categoría.' }),
  createdAt: z.iso.datetime(),
}).meta({ id: 'ExpenseCategory' });

export const expenseResponseSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  group: expenseGroupSchema,
  amount: moneySchema,
  spentOn: z.iso.date(),
  description: z.string().nullable(),
  source: expenseSourceSchema,
  cashRegisterId: z.uuid().nullable().meta({ description: 'Caja de la que salió el dinero (solo CASH_REGISTER).' }),
  canDelete: z.boolean().meta({ description: 'false si salió de una caja ya cerrada.' }),
  createdBy: z.uuid().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.iso.datetime(),
}).meta({ id: 'Expense' });

export const expensePageSchema = z.object({
  data: z.array(expenseResponseSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  totalAmount: moneySchema.meta({ description: 'Suma de todos los gastos que cumplen los filtros (no solo la página).' }),
}).meta({ id: 'ExpensePage' });

export type ExpenseCategory = z.infer<typeof expenseCategoryResponseSchema>;
export type Expense = z.infer<typeof expenseResponseSchema>;
export type ExpensePage = z.infer<typeof expensePageSchema>;
