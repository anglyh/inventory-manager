import type { PoolClient } from 'pg';
import type { StoreSettings } from '../../models/store.model.js';
import type { UpdateStoreSettingsDTO } from '../../schemas/store.schema.js';

export interface IStoreRepository {
  getSettings(storeId: string, client?: PoolClient): Promise<StoreSettings | null>;
  updateSettings(storeId: string, data: UpdateStoreSettingsDTO): Promise<void>;
}
