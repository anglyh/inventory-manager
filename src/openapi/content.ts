import type { ZodType } from 'zod';

/** Required JSON request body. */
export const jsonBody = (schema: ZodType) => ({
  required: true,
  content: { 'application/json': { schema } },
});

/** Response with a JSON body. */
export const jsonResponse = (description: string, schema: ZodType) => ({
  description,
  content: { 'application/json': { schema } },
});
