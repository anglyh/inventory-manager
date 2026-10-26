import type { PoolClient } from 'pg';
import type {
  Guest,
  LockedStay,
  RoomForCheckIn,
  StayChargeInsert,
  StayInsert,
  StayListItem,
  StayRecord,
} from '../../models/stay.model.js';
import type {
  GuestLookupDTO,
  StayGuestDTO,
  StayListQueryDTO,
  StayMinorDTO,
  StayPaymentDTO,
} from '../../schemas/stay.schema.js';

export interface IStayRepository {
  findGuest(storeId: string, filters: GuestLookupDTO): Promise<Guest | null>;

  lockRoomForCheckIn(storeId: string, roomId: string, client: PoolClient): Promise<RoomForCheckIn | null>;
  upsertGuest(storeId: string, guest: StayGuestDTO, client: PoolClient): Promise<string>;
  create(data: StayInsert, client: PoolClient): Promise<string>;
  addGuests(stayId: string, guests: { guestId: string; isHolder: boolean }[], client: PoolClient): Promise<void>;
  addMinors(stayId: string, minors: StayMinorDTO[], client: PoolClient): Promise<void>;
  addCharge(stayId: string, userId: string, charge: StayChargeInsert, client: PoolClient): Promise<void>;
  addPayment(
    stayId: string,
    cashRegisterId: string,
    userId: string,
    payment: StayPaymentDTO,
    client: PoolClient,
  ): Promise<void>;

  lock(storeId: string, id: string, client: PoolClient): Promise<LockedStay | null>;
  getBalance(id: string, client: PoolClient): Promise<number>;
  /** Sets actual_check_out and flags the room for cleaning. */
  close(id: string, userId: string, client: PoolClient): Promise<void>;
  setMigrationsReported(storeId: string, id: string, reported: boolean): Promise<boolean>;

  findById(storeId: string, id: string): Promise<StayRecord | null>;
  list(storeId: string, filters: StayListQueryDTO): Promise<{ data: StayListItem[]; total: number }>;
}
