import z from 'zod';

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(50),
}).strict();
export const supplierIdSchema = z.object({ id: z.uuid('ID de proveedor inválido') });
export type SupplierDTO = z.infer<typeof supplierSchema>;
