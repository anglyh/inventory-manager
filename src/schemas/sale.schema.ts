import z from 'zod';
import { PAYMENT_METHODS } from '../models/sale.model.js';

export const saleItemSchema = z.object({
  productId: z.uuid('ID de producto inválido'),
  quantity: z.number('Cantidad requerida').int('Debe ser un número entero').positive('Debe ser mayor a 0'),
})

export const createSaleSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS, 'Método de pago inválido'),
  items: z.array(saleItemSchema, 'Items requeridos').min(1, 'Debe incluir al menos un producto')
})

export type CreateSaleDTO = z.infer<typeof createSaleSchema>;
export type SaleItemDTO = z.infer<typeof saleItemSchema>