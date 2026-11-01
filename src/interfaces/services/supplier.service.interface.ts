import type { Supplier } from '../../models/supplier.model.js';
import type { SupplierDTO } from '../../schemas/supplier.schema.js';

export interface ISupplierService {
  list(storeId: string): Promise<Supplier[]>;
  create(storeId: string, body: SupplierDTO): Promise<Supplier>;
  update(storeId: string, id: string, body: SupplierDTO): Promise<Supplier>;
  delete(storeId: string, id: string): Promise<void>;
}
