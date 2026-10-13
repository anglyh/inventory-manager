import {
  initialLoadSchema,
  inventoryMovementIdSchema,
  inventoryMovementSchema,
  inventoryMovementsCursorQuerySchema,
  inventoryMovementsPageSchema,
  lossSchema,
  purchaseSchema,
  saleSchema,
  stockCountSchema,
  voidMovementSchema,
} from '../../schemas/inventory-movement.schema.js';
import { bearerAuth, registry } from '../registry.js';
import { jsonBody, jsonResponse } from '../content.js';
import { errorRef, standardErrors } from '../responses.js';

const basePath = '/api/inventory-movement';

export const inventoryMovementTag = {
  name: 'InventoryMovements',
  description: 'Registro e historial de ventas, compras, pérdidas, cargas iniciales y conteos físicos de inventario',
};

const tags = [inventoryMovementTag.name];

registry.registerPath({
  method: 'post',
  path: `${basePath}/sales`,
  summary: 'Registrar venta (OUT)',
  description: 'El servicio asigna SALE y OUT. Toda venta, incluso por Yape, requiere caja abierta. Si se omite cashRegisterId se utiliza la caja abierta de la tienda. No enviar reason ni movementType.',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(saleSchema) },
  responses: {
    204: { description: 'Venta registrada. Sin cuerpo de respuesta; consultar el historial para obtener el detalle.' },
    ...standardErrors('SaleConflict'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/purchases`,
  summary: 'Registrar compra (IN)',
  description: 'El servicio asigna PURCHASE e IN. No enviar reason ni movementType.',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(purchaseSchema) },
  responses: {
    204: { description: 'Compra registrada. Sin cuerpo de respuesta; consultar el historial para obtener el detalle.' },
    ...standardErrors('InventoryEntryConflict'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/losses`,
  summary: 'Registrar merma o pérdida (OUT)',
  description: 'No enviar precio por item: el costo se toma del costo promedio vigente del producto.',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(lossSchema) },
  responses: {
    204: { description: 'Pérdida registrada. Sin cuerpo de respuesta.' },
    ...standardErrors('InventoryExitConflict'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/initial-loads`,
  summary: 'Carga inicial (IN)',
  description: 'El servicio asigna INITIAL_LOAD e IN. Solo admite productos sin movimientos previos, incluso anulados. unitPrice representa el costo inicial por unidad. No afecta caja.',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(initialLoadSchema) },
  responses: {
    204: { description: 'Carga inicial registrada. Sin cuerpo de respuesta.' },
    ...standardErrors('InventoryEntryConflict'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/stock-counts`,
  summary: 'Registrar conteo físico y calcular diferencias',
  description: 'Enviar las cantidades contadas, no diferencias. Pausar movimientos mientras se cuenta. El servidor bloquea los productos y registra hasta dos movimientos: sobrantes IN y faltantes OUT, en una transacción. 409 si todo coincide; no registra movimientos vacíos. No afecta caja.',
  tags,
  security: bearerAuth,
  request: { body: jsonBody(stockCountSchema) },
  responses: {
    204: { description: 'Conteo aplicado, sin cuerpo. Actualizar productos e historial.' },
    ...standardErrors('OperationConflict'),
  },
});

registry.registerPath({
  method: 'post',
  path: `${basePath}/{id}/void`,
  summary: 'Anular un movimiento registrado por error',
  description: 'Exige motivo. Rechaza movimientos ya anulados o con movimientos completados posteriores de alguno de sus productos. Las ventas requieren su caja original abierta; las CASH requieren efectivo suficiente para revertir el importe. Las entradas restauran el costo anterior guardado y no pueden dejar stock negativo. No es una devolución parcial ni permite cambiar cierres históricos. No registre otro retiro por la misma reversión de venta.',
  tags,
  security: bearerAuth,
  request: { params: inventoryMovementIdSchema, body: jsonBody(voidMovementSchema) },
  responses: {
    204: { description: 'Movimiento anulado, sin cuerpo. Actualizar inventario, reportes y caja si corresponde.' },
    ...standardErrors('OperationConflict'),
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/{id}`,
  summary: 'Consultar detalle de movimiento completado o anulado',
  tags,
  security: bearerAuth,
  request: { params: inventoryMovementIdSchema },
  responses: {
    200: jsonResponse('Movimiento de la tienda con sus artículos.', inventoryMovementSchema),
    ...standardErrors('OperationConflict'),
  },
});

registry.registerPath({
  method: 'get',
  path: basePath,
  summary: 'Historial de movimientos con filtros por dirección y grupo',
  description: [
    'Sin filtros devuelve todos los movimientos completados. movementType filtra la dirección y group el grupo; si se envían ambos, se aplican juntos. Una combinación sin coincidencias devuelve data vacío.',
    'group=voids consulta anulados; los demás grupos consultan completados.',
    'Orden descendente por fecha de creación e id. La primera petición no envía cursor.',
    'Para la siguiente página, envía cursorDate y cursorId de nextCursor juntos y conserva los filtros. Al cambiar filtros, reinicia la paginación sin cursor.',
    '',
  ].join('\n'),
  tags,
  security: bearerAuth,
  request: { query: inventoryMovementsCursorQuerySchema },
  responses: {
    200: jsonResponse('Historial de movimientos y cursor de la siguiente página (null si no hay más).', inventoryMovementsPageSchema),
    400: errorRef('BadRequest'),
    401: errorRef('Unauthorized'),
    404: errorRef('CashRegisterNotFound'),
    422: errorRef('ValidationError'),
    500: errorRef('InternalError'),
    503: errorRef('DatabaseUnavailable'),
  },
});
