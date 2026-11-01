import type { CashRegister, CashRegisterMovement } from '../../models/cash-register.model.js';
import type { UserRole } from '../../models/user.model.js';
import type {
  CashMovementDTO,
  CashMovementHistoryDTO,
  CurrentCashMovementHistoryDTO,
  CashRegisterHistoryDTO,
  CloseCashRegisterDTO,
  OpenCashRegisterDTO,
} from '../../schemas/cash-register.schema.js';

export interface ICashRegisterService {
  open(
    storeId: string,
    userId: string,
    data: OpenCashRegisterDTO,
  ): Promise<{ id: string; status: 'OPEN' }>;

  current(storeId: string, role?: UserRole): Promise<CashRegister | null>;

  getById(storeId: string, id: string, role?: UserRole): Promise<CashRegister>;

  list(
    storeId: string,
    query: CashRegisterHistoryDTO,
    role?: UserRole,
  ): Promise<{ data: CashRegister[]; meta: { page: number; limit: number; total: number; totalPages: number } }>;

  listMovements(
    storeId: string,
    id: string,
    query: CashMovementHistoryDTO,
    role?: UserRole,
  ): Promise<{ data: CashRegisterMovement[]; meta: { page: number; limit: number; total: number; totalPages: number } }>;

  listCurrentMovements(
    storeId: string,
    query: CurrentCashMovementHistoryDTO,
    role?: UserRole,
  ): Promise<{ data: CashRegisterMovement[]; meta: { page: number; limit: number; total: number; totalPages: number } }>;

  addMovement(
    storeId: string,
    userId: string,
    id: string,
    data: CashMovementDTO,
    role?: UserRole,
  ): Promise<void>;

  close(
    storeId: string,
    userId: string,
    id: string,
    data: CloseCashRegisterDTO,
    role?: UserRole,
  ): Promise<void>;
}
