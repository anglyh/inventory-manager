import type { Guest, StayDetail, StayListItem } from '../../models/stay.model.js';
import type {
  CheckInDTO,
  CheckOutDTO,
  GuestLookupDTO,
  StayChargeDTO,
  StayListQueryDTO,
  StayPaymentDTO,
} from '../../schemas/stay.schema.js';

export interface StayPage {
  data: StayListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface IStayService {
  findGuest(storeId: string, filters: GuestLookupDTO): Promise<Guest | null>;
  checkIn(storeId: string, userId: string, data: CheckInDTO): Promise<StayDetail>;
  getById(storeId: string, id: string): Promise<StayDetail>;
  list(storeId: string, filters: StayListQueryDTO): Promise<StayPage>;
  addCharge(storeId: string, userId: string, id: string, data: StayChargeDTO): Promise<StayDetail>;
  addPayment(storeId: string, userId: string, id: string, data: StayPaymentDTO): Promise<StayDetail>;
  checkOut(storeId: string, userId: string, id: string, data: CheckOutDTO): Promise<StayDetail>;
  setMigrationsReported(storeId: string, id: string, reported: boolean): Promise<StayDetail>;
}
