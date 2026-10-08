import z from 'zod';

const money = z.number().nonnegative().max(99999999.99).multipleOf(0.01);
const notes = z.string().trim().max(500).optional();

export const openCashRegisterSchema = z.object({ openingAmount: money, notes }).strict();
export const closeCashRegisterSchema = z.object({ closingAmount: money, notes }).strict();
export const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT']),
  amount: money.positive(),
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500),
}).strict();
export const cashRegisterIdSchema = z.object({ id: z.uuid('ID de caja inválido') });

const registerPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
};
const movementPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
};
const currentMovementPageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().positive().max(100).default(5),
};
export const cashRegisterHistorySchema = z.object({
  ...registerPageFields, status: z.enum(['OPEN', 'CLOSED']).optional(),
}).strict();
export const cashMovementHistorySchema = z.object(movementPageFields).strict();
export const currentCashMovementHistorySchema = z.object(currentMovementPageFields).strict();

export type OpenCashRegisterDTO = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterDTO = z.infer<typeof closeCashRegisterSchema>;
export type CashMovementDTO = z.infer<typeof cashMovementSchema>;
export type CashRegisterHistoryDTO = z.infer<typeof cashRegisterHistorySchema>;
export type CashMovementHistoryDTO = z.infer<typeof cashMovementHistorySchema>;
export type CurrentCashMovementHistoryDTO = z.infer<typeof currentCashMovementHistorySchema>;
