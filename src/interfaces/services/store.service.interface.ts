import type { StoreSettings } from '../../models/store.model.js';
import type { UpdateStoreSettingsDTO } from '../../schemas/store.schema.js';

export interface IStoreService {
  getSettings(storeId: string): Promise<StoreSettings>;
  updateSettings(storeId: string, data: UpdateStoreSettingsDTO): Promise<StoreSettings>;
}
