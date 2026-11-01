import type { RateKind } from '../utils/stay-pricing.js';

export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  hourPrice: string;
  nightPrice: string;
  extraHourPrice: string;
  isActive: boolean;
  /** Rooms currently assigned to this type. */
  roomCount: number;
  createdAt: string;
}

export type RoomStatus = 'FREE' | 'OCCUPIED' | 'CLEANING';

export interface ActiveStaySummary {
  stayId: string;
  holderName: string | null;
  rateKind: RateKind;
  hours: number | null;
  checkInAt: string;
  expectedCheckOut: string;
  balance: string;
}

/** Board item: the room, its type and its computed status. */
export interface Room {
  id: string;
  number: string;
  floor: number | null;
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  needsCleaning: boolean;
  isActive: boolean;
  status: RoomStatus;
  activeStay: ActiveStaySummary | null;
}
