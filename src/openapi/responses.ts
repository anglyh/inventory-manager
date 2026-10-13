import z from 'zod';
import type { ApiError } from '../types/api.types.js';
import { registerSchema, registry } from './registry.js';

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST', 'INTERNAL_ERROR', 'INVALID_JSON', 'DB_ERROR', 'VALIDATION_ERROR']),
    message: z.string(),
    field: z.string().optional().meta({ description: 'Opcional. Campo asociado al error, cuando corresponde.' }),
    fields: z.array(z.object({ field: z.string(), message: z.string() })).optional()
      .meta({ description: 'Detalle de campos inválidos en errores de validación (422).' }),
  }),
}).meta({ id: 'ApiError' });

registerSchema(apiErrorSchema);

const apiErrorRef = { $ref: '#/components/schemas/ApiError' };

const errorResponse = (description: string, error: ApiError) => ({
  description,
  content: { 'application/json': { schema: apiErrorRef, example: { success: false, error } } },
});

const validationResponse = (field: string, message: string) => errorResponse(
  'Datos inválidos en el cuerpo, identificador o query. Los campos afectados aparecen en error.fields.',
  { code: 'VALIDATION_ERROR', message: 'Error de validación', fields: [{ field, message }] },
);

const movementConflictResponse = (includeStockError: boolean) => ({
  description: includeStockError
    ? 'Producto desactivado o stock insuficiente para una salida de inventario.'
    : 'Producto desactivado o carga inicial sobre un producto que ya tiene movimientos.',
  content: {
    'application/json': {
      schema: apiErrorRef,
      examples: {
        ...(!includeStockError ? {
          alreadyInitialized: {
            summary: 'Solo carga inicial: producto con historial',
            value: { success: false, error: { code: 'CONFLICT', message: 'El producto ya tiene movimientos; utilice una compra o un conteo físico' } },
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

/** Reusable error responses shared by every module (components.responses). */
const errorResponses = {
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
      schema: apiErrorRef,
      examples: {
        closed: { summary: 'Caja cerrada', value: { success: false, error: { code: 'CONFLICT', message: 'La caja está cerrada' } } },
        insufficientCash: { summary: 'Retiro superior al efectivo esperado', value: { success: false, error: { code: 'CONFLICT', message: 'Efectivo insuficiente en la caja para realizar el retiro' } } },
      },
    } },
  },
  SaleConflict: {
    description: 'Sin caja abierta, caja cerrada, producto desactivado o stock insuficiente.',
    content: { 'application/json': {
      schema: apiErrorRef,
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

export type ErrorResponseName = keyof typeof errorResponses;

for (const [name, response] of Object.entries(errorResponses)) {
  registry.registerComponent('responses', name, response);
}

/** Reference to a shared error response; the name is checked at compile time. */
export const errorRef = (name: ErrorResponseName) => ({ $ref: `#/components/responses/${name}` });

/** Error responses documented by every write-style operation; only the 409 response varies. */
export const standardErrors = (conflict: ErrorResponseName = 'OperationConflict') => ({
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  404: errorRef('NotFound'),
  409: errorRef(conflict),
  422: errorRef('ValidationError'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
});
