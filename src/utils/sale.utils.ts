import { BadRequest } from '../errors/app.error.js';
import type { Product } from '../models/product.model.js';

export function validateProductStock(product: Product, requestedQuantity: number) {
  if (product.stock < requestedQuantity) {
    throw new BadRequest(
      `No hay suficiente stock para ${product.name} - Stock disponible: ${product.stock}, solicitado: ${requestedQuantity}`
    );
  }
}
