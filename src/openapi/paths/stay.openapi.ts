import {
  checkInSchema,
  checkOutSchema,
  guestLookupSchema,
  nullableGuestSchema,
  stayChargeSchema,
  stayDetailSchema,
  stayIdSchema,
  stayListQuerySchema,
  stayMigrationsSchema,
  stayPageSchema,
  stayPaymentIdSchema,
  stayPaymentSchema,
  voidStayPaymentSchema,
} from '../../schemas/stay.schema.js';
import { jsonBody, jsonResponse } from '../content.js';
import { registry } from '../registry.js';
import { adminOnly, errorRef, standardErrors } from '../responses.js';

export const stayTag = {
  name: 'Stays',
  description: 'Estadías del hostal: check-in, cuenta (cargos y pagos), check-out y Registro de Huéspedes. Las opera el personal.',
};

const tags = [stayTag.name];
const errors = standardErrors('StayConflict');

const readErrors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  422: errorRef('ValidationError'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: '/api/guest',
  summary: 'Buscar huésped por documento',
  description: 'Para autocompletar el check-in de un huésped que ya vino. Devuelve null si no existe.',
  tags,
  request: { query: guestLookupSchema },
  responses: {
    200: jsonResponse('Huésped o null.', nullableGuestSchema),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/stay',
  summary: 'Check-in',
  description: 'En una transacción: registra o actualiza los huéspedes por documento, crea la estadía, sus menores, el cargo de la tarifa (sugerida desde el tipo de habitación y monto elegido) y el adelanto opcional en la caja abierta. La habitación debe estar libre; los huéspedes adultos no pueden superar su capacidad (los menores no cuentan).',
  tags,
  request: { body: jsonBody(checkInSchema) },
  responses: {
    201: jsonResponse('Estadía creada.', stayDetailSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/stay',
  summary: 'Registro de Huéspedes',
  description: 'Estadías por fecha de ingreso [from, to), con los datos legales de los huéspedes. Orden descendente por ingreso. Usa page (predeterminado 1) y limit (predeterminado 20, máximo 100).',
  tags,
  request: { query: stayListQuerySchema },
  responses: {
    200: jsonResponse('Página de estadías.', stayPageSchema),
    ...readErrors,
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/stay/{id}',
  summary: 'Detalle de estadía',
  description: 'Huéspedes, menores, cargos, pagos, saldo y el adicional sugerido al momento de la consulta.',
  tags,
  request: { params: stayIdSchema },
  responses: {
    200: jsonResponse('Estadía.', stayDetailSchema),
    ...readErrors,
    404: errorRef('NotFound'),
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/stay/{id}/charge',
  summary: 'Agregar cargo a la estadía',
  description: 'Horas adicionales u otro cargo. Solo en estadías activas.',
  tags,
  request: { params: stayIdSchema, body: jsonBody(stayChargeSchema) },
  responses: {
    201: jsonResponse('Estadía actualizada.', stayDetailSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/stay/{id}/payment',
  summary: 'Cobrar a la estadía',
  description: 'Entra a la caja abierta (el efectivo suma al efectivo esperado). No puede superar el saldo pendiente.',
  tags,
  request: { params: stayIdSchema, body: jsonBody(stayPaymentSchema) },
  responses: {
    201: jsonResponse('Estadía actualizada.', stayDetailSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/stay/{id}/payment/{paymentId}/void',
  summary: 'Anular un pago registrado por error',
  description: 'Solo ADMIN, igual que anular una venta. Exige motivo; el pago no se edita ni se borra: queda anulado con quién, cuándo y por qué, y deja de sumar al saldo, a la caja y a los reportes. Solo en estadías activas. Requiere la caja original del pago abierta; si fue en efectivo, efectivo suficiente para revertirlo. Rechaza pagos ya anulados.',
  tags,
  request: { params: stayPaymentIdSchema, body: jsonBody(voidStayPaymentSchema) },
  responses: {
    ...adminOnly,
    200: jsonResponse('Estadía actualizada.', stayDetailSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/stay/{id}/check-out',
  summary: 'Check-out',
  description: 'En una transacción: agrega el adicional por horas (sugerido por el servidor; extraAmount lo reemplaza y 0 lo condona), cobra el pago opcional y cierra solo si el saldo queda en 0. La habitación pasa a limpieza.',
  tags,
  request: { params: stayIdSchema, body: jsonBody(checkOutSchema) },
  responses: {
    200: jsonResponse('Estadía cerrada.', stayDetailSchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/stay/{id}/migrations',
  summary: 'Marcar reporte a Migraciones',
  description: 'reported = true guarda la fecha del reporte (se conserva la primera); false la borra.',
  tags,
  request: { params: stayIdSchema, body: jsonBody(stayMigrationsSchema) },
  responses: {
    200: jsonResponse('Estadía actualizada.', stayDetailSchema),
    ...readErrors,
    404: errorRef('NotFound'),
  },
});
