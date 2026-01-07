import type { PoolClient } from 'pg';
import type { Adjustment, AdjustmentDetailResponse, AdjustmentInsert } from '../../models/adjustment.model.js';
import type { AdjustmentItem, AdjustmentItemInsert } from '../../models/adjustment-item.model.js';

export interface IAdjustmentRepository {
  createAdjustment(userId: string, adjustmentBasicData: AdjustmentInsert, client: PoolClient): Promise<Adjustment>;
  listAll(userId: string): Promise<AdjustmentDetailResponse[]>;
  createAjustmentItems(
    userId: string,
    adjustmentItems: AdjustmentItemInsert[],
    client: PoolClient
  ): Promise<AdjustmentItem[]>;
}

