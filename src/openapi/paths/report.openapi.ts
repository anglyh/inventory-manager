import {
  profitByProductQuerySchema,
  profitByProductSchema,
  profitSummaryQuerySchema,
  profitSummarySchema,
} from '../../schemas/report.schema.js';
import { jsonResponse } from '../content.js';
import { bearerAuth, registry } from '../registry.js';
import { errorRef } from '../responses.js';

const basePath = '/api/report';

export const reportTag = {
  name: 'Reports',
  description: 'Reportes de ganancias basados en movimientos OUT (ventas)',
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
  path: `${basePath}/profit/summary`,
  summary: 'Resumen de ganancias del periodo',
  description: 'Totales del rango: ingresos, COGS, ganancia, margen %, # ventas y ticket promedio.\nSi no se envían `from` y `to`, se asumen los últimos 30 días.\n',
  tags,
  security: bearerAuth,
  request: { query: profitSummaryQuerySchema },
  responses: {
    200: jsonResponse('Totales y rango efectivo del periodo.', profitSummarySchema),
    ...errors,
  },
});

registry.registerPath({
  method: 'get',
  path: `${basePath}/profit/by-product`,
  summary: 'Top productos por ganancia',
  tags,
  security: bearerAuth,
  request: { query: profitByProductQuerySchema },
  responses: {
    200: jsonResponse('Ranking de productos y rango efectivo del periodo.', profitByProductSchema),
    ...errors,
  },
});
