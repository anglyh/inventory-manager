import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry, standaloneSchemas, bearerAuth } from './registry.js';
import './responses.js';
import { cashRegisterTag } from './paths/cash-register.openapi.js';
import { inventoryMovementTag } from './paths/inventory-movement.openapi.js';
import './paths/store-user.openapi.js';
import './paths/supplier.openapi.js';

export const openApiInfo = {
  title: 'Hostal API',
  version: '1.0.0',
  description: 'API del proyecto Hostal. Cada petición recibe una sola de las respuestas documentadas. Un 204 confirma el éxito sin cuerpo; los ejemplos JSON de errores solo se devuelven cuando ocurre el error correspondiente.',
};

export const openApiServers = [
  { url: 'http://localhost:3000', description: 'Development server' },
];

/** Builds the OpenAPI 3.0 document from every path and component registered from Zod. */
export const generateOpenApiDocument = () => new OpenApiGeneratorV3([...registry.definitions, ...standaloneSchemas])
  .generateDocument({
    openapi: '3.0.0',
    info: openApiInfo,
    servers: openApiServers,
    security: bearerAuth,
    tags: [cashRegisterTag, inventoryMovementTag],
  });
