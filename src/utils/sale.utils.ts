import { BadRequest } from '../errors/app.error.js';
import type { Product } from '../models/product.model.js';
import type { SaleTotals } from '../models/sale.model.js';

export function validateProductStock(product: Product, requestedQuantity: number) {
  if (product.stock < requestedQuantity) {
    throw new BadRequest(
      `No hay suficiente stock para ${product.name} - Stock disponible: ${product.stock}, solicitado: ${requestedQuantity}`
    );
  }
}

export function calculateItemTotals(
  product: Product,
  quantity: number
): Pick<SaleTotals, "totalAmount" | "totalUnitCost"> {
  return {
    totalAmount: product.salePrice * quantity,
    totalUnitCost: product.unitCost * quantity
  }
}

export const calculateProfit = (totalAmount: number,  totalUnitCost: number) => totalAmount - totalUnitCost
