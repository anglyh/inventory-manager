import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { ZodType } from 'zod';

/**
 * Shared registry for every documented operation and reusable component.
 *
 * Schemas are named with Zod's native `.meta({ id })`, so no `extendZodWithOpenApi` call is
 * needed and schema modules do not depend on any import order.
 */
export const registry = new OpenAPIRegistry();

type Definition = OpenAPIRegistry['definitions'][number];

/** Named Zod schemas published in components.schemas even when no route references them directly. */
export const standaloneSchemas: Definition[] = [];

/**
 * Publishes a schema named with `.meta({ id })`. `registry.register` cannot be used because it
 * relies on `extendZodWithOpenApi`, and plain Zod 4 schemas cannot be passed to the generator
 * directly because their `type` property is mistaken for a definition type.
 */
export const registerSchema = (schema: ZodType) => {
  standaloneSchemas.push({ type: 'schema', schema });
};

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export const bearerAuth = [{ bearerAuth: [] }];
