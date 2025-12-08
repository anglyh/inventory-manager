import type { AdjustmentItem } from './adjustment-item.model.js';
import type { User } from './user.model.js';

export type InventoryAdjustmentReason = "caducidad" | "error_conteo" | "otro"

export interface Adjustment {
  id: string;
  userId: User["id"];
  notes?: string | undefined;
  reasonType: InventoryAdjustmentReason | "error_conteo";
  createdAt: Date
}

export type AdjustmentInsert = Pick<Adjustment, "notes" | "reasonType">

export type AdjustmentDetailResponse = Omit<Adjustment, "userId"> & {
  items: AdjustmentItem[]
}