import {
  createExpenseCategorySchema,
  createExpenseSchema,
  expenseCategoryIdSchema,
  expenseCategoryResponseSchema,
  expenseIdSchema,
  expenseListQuerySchema,
  expensePageSchema,
  expenseResponseSchema,
  updateExpenseCategorySchema,
} from '../../schemas/expense.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { adminOnly, errorRef, standardErrors } from '../responses.js';

export const expenseTag = {
  name: 'Expenses',
  description: 'Gastos del negocio y su catálogo de categorías (solo ADMIN)',
};

const tags = [expenseTag.name];
const errors = standardErrors();

// Errors returned by every read-only operation.
const readErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  422: errorRef('ValidationError'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: '/api/expense-category',
  summary: 'Listar categorías de gasto',
  description: 'Incluye las desactivadas (isActive = false); las activas primero.',
  tags,
  responses: {
    ...adminOnly,
    200: jsonResponse('Categorías de gasto.', expenseCategoryResponseSchema.array()),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/expense-category',
  summary: 'Crear categoría de gasto',
  description: 'El nombre es único por tienda (sin distinguir mayúsculas): un duplicado responde 409.',
  tags,
  request: { body: jsonBody(createExpenseCategorySchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Categoría creada.', expenseCategoryResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/expense-category/{id}',
  summary: 'Editar o desactivar categoría de gasto',
  description: 'Solo cambia los campos enviados. Cambiar el grupo reclasifica también los gastos ya registrados.',
  tags,
  request: { params: expenseCategoryIdSchema, body: jsonBody(updateExpenseCategorySchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Categoría actualizada.', expenseCategoryResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/expense-category/{id}',
  summary: 'Eliminar categoría de gasto sin gastos',
  description: 'Si la categoría tiene gastos registrados responde 409: hay que desactivarla.',
  tags,
  request: { params: expenseCategoryIdSchema },
  responses: {
    ...adminOnly,
    204: { description: 'Categoría eliminada, sin cuerpo.' },
    ...errors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/expense',
  summary: 'Listar gastos',
  description: 'Ordenados por día (más recientes primero). `from`/`to` se comparan con el día Lima del gasto, como la serie diaria del reporte.',
  tags,
  request: { query: expenseListQuerySchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Página de gastos con el total del filtro.', expensePageSchema),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/expense',
  summary: 'Registrar gasto',
  description: 'Con source = CASH_REGISTER registra además un retiro (CASH_OUT) en la caja abierta, en la misma transacción. Sin caja abierta, con efectivo insuficiente o con la categoría desactivada responde 409.',
  tags,
  request: { body: jsonBody(createExpenseSchema) },
  responses: {
    ...adminOnly,
    201: jsonResponse('Gasto registrado.', expenseResponseSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/expense/{id}',
  summary: 'Eliminar gasto',
  description: 'Un gasto pagado con la caja solo se elimina mientras esa caja siga abierta (se borra también su retiro); si la caja ya cerró responde 409.',
  tags,
  request: { params: expenseIdSchema },
  responses: {
    ...adminOnly,
    204: { description: 'Gasto eliminado, sin cuerpo.' },
    ...errors,
  },
});
