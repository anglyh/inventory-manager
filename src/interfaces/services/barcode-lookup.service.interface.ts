import type { BarcodeLookup } from '../../schemas/product.schema.js';

export interface IBarcodeLookupService {
  /** Looks a barcode up: own store products first, then free open product databases. */
  lookup(storeId: string, code: string): Promise<BarcodeLookup>;
}
