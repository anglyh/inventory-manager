import type { PoolClient } from 'pg';
import type { Supplier } from '../../models/supplier.model.js';

export interface ISupplierRepository {
  list(storeId: string): Promise<Supplier[]>;
  findById(storeId: string, id: string, client: PoolClient): Promise<Supplier | null>;
  create(storeId: string, name: string): Promise<Supplier>;
  update(storeId: string, id: string, name: string): Promise<Supplier | null>;
  delete(storeId: string, id: string): Promise<boolean>;
}
