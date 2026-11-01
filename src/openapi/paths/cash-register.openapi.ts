import {
  cashMovementHistorySchema,
  cashMovementPageSchema,
  cashMovementSchema,
  cashRegisterHistorySchema,
  cashRegisterIdSchema,
  cashRegisterOpenedSchema,
  cashRegisterPageSchema,
  cashRegisterSchema,
  closeCashRegisterSchema,
  currentCashMovementHistorySchema,
  nullableCashRegisterSchema,
  openCashRegisterSchema,
} from '../../schemas/cash-register.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { errorRef, adminOnly } from '../responses.js';

const basePath = '/api/cash-register';

export const cashRegisterTag = {
  name: 'CashRegisters',
  description: 'Caja compartida por los usuarios de la tienda. Pausar las operaciones mientras se cuenta el efectivo; no hay cierre automático a medianoche.',
};

const tags = [cashRegisterTag.name];

// Errors returned by every cash register operation.
const commonErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: `${basePath}/current`,
  summary: 'Consultar la caja abierta de la tienda',
  tags,
  responses: {
    200: jsonResponse('Caja abierta con resumen actualizado, o null si no existe.', nullableCashRegisterSchema),
    ...commonErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/current/movements`,
  summary: 'Movimientos de la caja abierta',
  description: 'Lista aportes y retiros de la caja actual, ordenados por fecha e id descendentes. La página predeterminada contiene 5 movimientos.',
  tags,
  request: { query: currentCashMovementHistorySchema },
  responses: {
    200: jsonResponse('Página de movimientos, vacía si no hay caja abierta.', cashMovementPageSchema),
    ...commonErrors,
    422: errorRef('CashMovementQueryValidation'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/open`,
  summary: 'Abrir caja con el efectivo inicial',
  description: 'Una sola caja abierta por tienda. El servidor registra fecha y responsable autenticado.',
  tags,
  request: { body: jsonBody(openCashRegisterSchema) },
  responses: {
    201: jsonResponse('Caja abierta.', cashRegisterOpenedSchema),
    ...commonErrors,
    409: errorRef('CashRegisterAlreadyOpen'),
    422: errorRef('CashRegisterOpeningValidation'),
  },
});

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Historial de cajas',
  description: 'Orden descendente por apertura e id. Usa page (predeterminado 1) y limit (predeterminado 12, máximo 100); conserva el filtro status entre páginas. El summary depende del rol autenticado; expectedCash solo se entrega a ADMIN.',
  tags,
  request: { query: cashRegisterHistorySchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Página de cajas de la tienda.', cashRegisterPageSchema),
    ...commonErrors,
    422: errorRef('CashRegisterQueryValidation'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/{id}`,
  summary: 'Consultar una caja y su arqueo',
  description: 'El resumen de una caja abierta se calcula en el momento. El de una caja cerrada es el guardado al cerrar. Los cierres antiguos sin arqueo guardado tienen summary null. El summary depende del rol autenticado; expectedCash solo se entrega a ADMIN.',
  tags,
  request: { params: cashRegisterIdSchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Datos y resumen de la caja.', cashRegisterSchema),
    ...commonErrors,
    404: errorRef('CashRegisterNotFound'),
    422: errorRef('CashRegisterIdValidation'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/{id}/movements`,
  summary: 'Consultar aportes y retiros manuales',
  description: 'No incluye ventas. Orden descendente por fecha e id. Usa page (predeterminado 1) y limit (predeterminado 20, máximo 100).',
  tags,
  request: { params: cashRegisterIdSchema, query: cashMovementHistorySchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Página de movimientos manuales de efectivo.', cashMovementPageSchema),
    ...commonErrors,
    404: errorRef('CashRegisterNotFound'),
    422: errorRef('CashMovementQueryValidation'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/{id}/movements`,
  summary: 'Registrar un aporte o retiro de efectivo',
  description: 'Requiere caja abierta. El motivo es obligatorio y un retiro no puede superar el efectivo esperado. No registrar aquí el efecto de una venta.',
  tags,
  request: { params: cashRegisterIdSchema, body: jsonBody(cashMovementSchema) },
  responses: {
    204: { description: 'Movimiento registrado, sin cuerpo de respuesta.' },
    ...commonErrors,
    404: errorRef('CashRegisterNotFound'),
    409: errorRef('CashMovementConflict'),
    422: errorRef('CashMovementValidation'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/{id}/close`,
  summary: 'Cerrar caja con el efectivo contado',
  description: 'Pausar ventas y movimientos mientras se cuenta. Si hay diferencia, notes debe explicar el motivo. El servidor calcula y conserva el arqueo definitivo; no se permite reabrir.',
  tags,
  request: { params: cashRegisterIdSchema, body: jsonBody(closeCashRegisterSchema) },
  responses: {
    204: { description: 'Caja cerrada. Consultar GET /api/cash-register/{id} para ver el arqueo.' },
    ...commonErrors,
    404: errorRef('CashRegisterNotFound'),
    409: errorRef('CashRegisterClosed'),
    422: errorRef('CashRegisterClosingValidation'),
  },
});
