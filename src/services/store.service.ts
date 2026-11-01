import { NotFoundError } from '../errors/app.error.js';
import type { IStoreRepository } from '../interfaces/repositories/store.repository.interface.js';
import type { IStoreService } from '../interfaces/services/store.service.interface.js';
import type { StoreSettings } from '../models/store.model.js';
import type { UpdateStoreSettingsDTO } from '../schemas/store.schema.js';

export default class StoreService implements IStoreService {
  constructor(private storeRepo: IStoreRepository) {}

  async getSettings(storeId: string): Promise<StoreSettings> {
    const settings = await this.storeRepo.getSettings(storeId);
    if (!settings) throw new NotFoundError('La tienda no existe');
    return settings;
  }

  async updateSettings(storeId: string, data: UpdateStoreSettingsDTO): Promise<StoreSettings> {
    await this.storeRepo.updateSettings(storeId, data);
    return this.getSettings(storeId);
  }
}
