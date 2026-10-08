import { NotFoundError } from '../errors/app.error.js';
import type { ISupplierRepository } from '../interfaces/repositories/supplier.repository.interface.js';
import type { ISupplierService } from '../interfaces/services/supplier.service.interface.js';
import type { SupplierDTO } from '../schemas/supplier.schema.js';

export default class SupplierService implements ISupplierService {
  constructor(private repo: ISupplierRepository) {}

  list(storeId: string) {
    return this.repo.list(storeId);
  }

  create(storeId: string, body: SupplierDTO) {
    return this.repo.create(storeId, body.name);
  }

  async update(storeId: string, id: string, body: SupplierDTO) {
    const supplier = await this.repo.update(storeId, id, body.name);
    if (!supplier) throw new NotFoundError('El proveedor no existe');
    return supplier;
  }

  async delete(storeId: string, id: string) {
    if (!await this.repo.delete(storeId, id)) throw new NotFoundError('El proveedor no existe');
  }
}
