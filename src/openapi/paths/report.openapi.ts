import { reportOverviewQuerySchema, reportOverviewSchema } from '../../schemas/report.schema.js';
import { jsonResponse } from '../content.js';
import { bearerAuth, registry } from '../registry.js';
import { errorRef, adminOnly } from '../responses.js';

const basePath = '/api/report';

export const reportTag = {
  name: 'Reports',
  description: 'Reportes de ventas, ganancias, pérdidas y cuadre de caja',
};

const tags = [reportTag.name];

// Errors returned by every report operation.
const errors = {
  400: errorRef('BadRequest'),
  401: errorRef('Unauthorized'),
  422: errorRef('ValidationError'),
  500: errorRef('InternalError'),
  503: errorRef('DatabaseUnavailable'),
};

registry.registerPath({
  method: 'get',
  path: `${basePath}/overview`,
  summary: 'Resumen del periodo',
  description: 'Ventas, resultado de la tienda y del hospedaje, ganancia neta (con la diferencia neta de caja y los gastos generales), cobros por método, serie diaria (día Lima), productos vendidos, comparación con el período anterior, compras del rango y una foto actual del inventario.\nSi no se envían `from` y `to`, se asumen los últimos 30 días. Máximo 366 días.\n',
  tags,
  security: bearerAuth,
  request: { query: reportOverviewQuerySchema },
  responses: {
    ...adminOnly,
    200: jsonResponse('Resumen y rango efectivo del periodo.', reportOverviewSchema),
    ...errors,
  },
});
