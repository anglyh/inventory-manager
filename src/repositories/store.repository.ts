import type { PoolClient } from 'pg';
import { query } from '../db/index.js';
import type { IStoreRepository } from '../interfaces/repositories/store.repository.interface.js';
import type { StoreSettings } from '../models/store.model.js';
import type { UpdateStoreSettingsDTO } from '../schemas/store.schema.js';
import { snakeToCamel } from '../utils/mapper.js';
import { buildSet } from './sql.js';

const selectSettings = `
SELECT
  to_char(checkout_time, 'HH24:MI') AS checkout_time,
  extra_tolerance_minutes
FROM store
WHERE id = $1
`;

export default class StoreRepository implements IStoreRepository {
  async getSettings(storeId: string, client?: PoolClient): Promise<StoreSettings | null> {
    const result = client ? await client.query(selectSettings, [storeId]) : await query(selectSettings, [storeId]);
    return result.rows[0] ? snakeToCamel(result.rows[0]) : null;
  }

  async updateSettings(storeId: string, data: UpdateStoreSettingsDTO): Promise<void> {
    const { set, params } = buildSet(data, {
      checkoutTime: 'checkout_time',
      extraToleranceMinutes: 'extra_tolerance_minutes',
    }, 1);
    if (!set) return;
    await query(`UPDATE store SET ${set} WHERE id = $1`, [storeId, ...params]);
  }
}
