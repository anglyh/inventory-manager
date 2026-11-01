import type z from 'zod';
import type {
  guestResponseSchema,
  stayDetailSchema,
  stayListItemSchema,
} from '../schemas/stay.schema.js';
import type { RateKind } from '../utils/stay-pricing.js';

export type Guest = z.infer<typeof guestResponseSchema>;
export type StayListItem = z.infer<typeof stayListItemSchema>;
export type StayDetail = z.infer<typeof stayDetailSchema>;
/** Detail as read from the database; the service adds the suggested extra. */
export type StayRecord = Omit<StayDetail, 'suggestedExtra'>;

/** Room row locked for a check-in, with the tariffs of its type. */
export interface RoomForCheckIn {
  id: string;
  number: string;
  isActive: boolean;
  needsCleaning: boolean;
  occupied: boolean;
  capacity: number;
  hourPrice: string;
  nightPrice: string;
  extraHourPrice: string;
}

/** Stay row locked for charges, payments and check-out. */
export interface LockedStay {
  id: string;
  roomId: string;
  closed: boolean;
  expectedCheckOut: Date;
  extraHourPrice: string;
}

export interface StayInsert {
  storeId: string;
  roomId: string;
  rateKind: RateKind;
  hours: number | null;
  expectedCheckOut: Date;
  travelReason: string | null;
  notes: string | null;
  extraHourPrice: string;
  createdBy: string;
}

export interface StayChargeInsert {
  kind: 'RATE' | 'EXTRA_HOURS' | 'OTHER';
  description: string;
  suggestedAmount: number | string | null;
  amount: number;
}
